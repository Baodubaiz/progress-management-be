import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import {
  CreateBoardInput,
  UpdateBoardInput,
  GetBoardsQueryInput,
} from './board.validation';

const POSITION_GAP = 65535;

export class BoardService {
  /**
   * Helper: Check if a user is a member of the project and return their role
   */
  async getMemberRole(projectId: bigint, userId: bigint) {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    return member?.role || null;
  }

  /**
   * Create a new board in a project
   */
  async createBoard(userId: string, data: CreateBoardInput) {
    const userBigInt = BigInt(userId);
    const projectBigInt = BigInt(data.projectId);

    // Verify project membership
    const memberRole = await this.getMemberRole(projectBigInt, userBigInt);
    if (!memberRole) {
      throw new AppError('Project not found or you are not a member of this project', 403);
    }

    const initialColumns = data.initialColumns || ['To Do', 'In Progress', 'Done'];

    const board = await prisma.$transaction(async (tx) => {
      // 1. Create board
      const newBoard = await tx.board.create({
        data: {
          projectId: projectBigInt,
          name: data.name,
          description: data.description,
          createdBy: userBigInt,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      // 2. Create initial columns if any
      if (initialColumns.length > 0) {
        await tx.column.createMany({
          data: initialColumns.map((colName, index) => ({
            boardId: newBoard.id,
            name: colName,
            position: new Prisma.Decimal((index + 1) * POSITION_GAP),
          })),
        });
      }

      // 3. Re-fetch board with created columns
      return tx.board.findUnique({
        where: { id: newBoard.id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
          columns: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    return board;
  }

  /**
   * Get all boards belonging to a project
   */
  async getBoardsByProject(userId: string, query: GetBoardsQueryInput) {
    const userBigInt = BigInt(userId);
    const projectBigInt = BigInt(query.projectId);

    // Verify project membership
    const memberRole = await this.getMemberRole(projectBigInt, userBigInt);
    if (!memberRole) {
      throw new AppError('Project not found or you are not a member of this project', 403);
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.BoardWhereInput = {
      projectId: projectBigInt,
    };

    if (query.search) {
      whereClause.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const [total, boards] = await Promise.all([
      prisma.board.count({ where: whereClause }),
      prisma.board.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              columns: true,
            },
          },
          columns: {
            select: {
              id: true,
              _count: {
                select: {
                  tasks: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedBoards = boards.map((b) => {
      const totalTasks = b.columns.reduce((sum, col) => sum + col._count.tasks, 0);
      return {
        id: b.id,
        projectId: b.projectId,
        name: b.name,
        description: b.description,
        createdBy: b.createdBy,
        creator: b.creator,
        columnsCount: b._count.columns,
        tasksCount: totalTasks,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });

    return {
      boards: formattedBoards,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get board detail by ID (including full columns and tasks hierarchy)
   */
  async getBoardById(userId: string, boardId: string) {
    const userBigInt = BigInt(userId);
    const boardBigInt = BigInt(boardId);

    const board = await prisma.board.findUnique({
      where: { id: boardBigInt },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: {
                creator: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
                assignees: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        email: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
                taskLabels: {
                  include: {
                    label: true,
                  },
                },
                _count: {
                  select: {
                    comments: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Verify project membership
    const memberRole = await this.getMemberRole(board.projectId, userBigInt);
    if (!memberRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    return {
      ...board,
      userRole: memberRole,
    };
  }

  /**
   * Update board metadata (name, description)
   */
  async updateBoard(userId: string, boardId: string, data: UpdateBoardInput) {
    const userBigInt = BigInt(userId);
    const boardBigInt = BigInt(boardId);

    const board = await prisma.board.findUnique({
      where: { id: boardBigInt },
      select: { id: true, projectId: true, createdBy: true },
    });

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const memberRole = await this.getMemberRole(board.projectId, userBigInt);
    if (!memberRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    const updated = await prisma.board.update({
      where: { id: boardBigInt },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete board
   */
  async deleteBoard(userId: string, boardId: string) {
    const userBigInt = BigInt(userId);
    const boardBigInt = BigInt(boardId);

    const board = await prisma.board.findUnique({
      where: { id: boardBigInt },
      select: { id: true, projectId: true, createdBy: true },
    });

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const memberRole = await this.getMemberRole(board.projectId, userBigInt);
    if (!memberRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    // Only project OWNER or board creator can delete the board
    if (memberRole !== 'OWNER' && board.createdBy !== userBigInt) {
      throw new AppError('Only project owners or the board creator can delete this board', 403);
    }

    await prisma.board.delete({
      where: { id: boardBigInt },
    });

    return { message: 'Board deleted successfully' };
  }
}

export const boardService = new BoardService();
