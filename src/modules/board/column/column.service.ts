import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import {
  CreateColumnInput,
  UpdateColumnInput,
  MoveColumnInput,
} from './column.validation';

const POSITION_GAP = 65535;

export class ColumnService {
  /**
   * Helper: Check if a user is a member of the project
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
   * Helper: Check board access for user
   */
  async getBoardWithAccess(boardId: bigint, userId: bigint) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, projectId: true, createdBy: true },
    });

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const memberRole = await this.getMemberRole(board.projectId, userId);
    if (!memberRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    return { board, memberRole };
  }

  /**
   * Helper: Check column access for user
   */
  async getColumnWithAccess(columnId: bigint, userId: bigint) {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          select: { id: true, projectId: true, createdBy: true },
        },
      },
    });

    if (!column) {
      throw new AppError('Column not found', 404);
    }

    const memberRole = await this.getMemberRole(column.board.projectId, userId);
    if (!memberRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    return { column, memberRole };
  }

  /**
   * Helper: Calculate fractional position between adjacent items
   */
  calculatePosition(
    prevPos?: string | number | null,
    nextPos?: string | number | null
  ): Prisma.Decimal {
    const prev = prevPos != null ? new Prisma.Decimal(prevPos.toString()) : null;
    const next = nextPos != null ? new Prisma.Decimal(nextPos.toString()) : null;

    if (prev && next) {
      // Midpoint between prev and next
      return prev.add(next).dividedBy(2);
    } else if (prev && !next) {
      // Place after prev
      return prev.add(POSITION_GAP);
    } else if (!prev && next) {
      // Place before next
      return next.dividedBy(2);
    } else {
      // Default initial position
      return new Prisma.Decimal(POSITION_GAP);
    }
  }

  /**
   * Create a new column in a board
   */
  async createColumn(userId: string, data: CreateColumnInput) {
    const userBigInt = BigInt(userId);
    const boardBigInt = BigInt(data.boardId);

    await this.getBoardWithAccess(boardBigInt, userBigInt);

    let position: Prisma.Decimal;
    if (data.position !== undefined) {
      position = new Prisma.Decimal(data.position.toString());
    } else {
      // Auto-calculate position as max(position) + POSITION_GAP
      const lastColumn = await prisma.column.findFirst({
        where: { boardId: boardBigInt },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      if (lastColumn) {
        position = lastColumn.position.add(POSITION_GAP);
      } else {
        position = new Prisma.Decimal(POSITION_GAP);
      }
    }

    const column = await prisma.column.create({
      data: {
        boardId: boardBigInt,
        name: data.name,
        position,
      },
    });

    return column;
  }

  /**
   * Get all columns of a board
   */
  async getColumnsByBoard(userId: string, boardId: string) {
    const userBigInt = BigInt(userId);
    const boardBigInt = BigInt(boardId);

    await this.getBoardWithAccess(boardBigInt, userBigInt);

    const columns = await prisma.column.findMany({
      where: { boardId: boardBigInt },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    return columns;
  }

  /**
   * Get column details by ID
   */
  async getColumnById(userId: string, columnId: string) {
    const userBigInt = BigInt(userId);
    const columnBigInt = BigInt(columnId);

    const { column } = await this.getColumnWithAccess(columnBigInt, userBigInt);

    const fullColumn = await prisma.column.findUnique({
      where: { id: columnBigInt },
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
    });

    return fullColumn;
  }

  /**
   * Update column (name, position)
   */
  async updateColumn(userId: string, columnId: string, data: UpdateColumnInput) {
    const userBigInt = BigInt(userId);
    const columnBigInt = BigInt(columnId);

    await this.getColumnWithAccess(columnBigInt, userBigInt);

    const updated = await prisma.column.update({
      where: { id: columnBigInt },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.position !== undefined && {
          position: new Prisma.Decimal(data.position.toString()),
        }),
      },
    });

    return updated;
  }

  /**
   * Move/Reorder column with fractional index calculation
   */
  async moveColumn(userId: string, columnId: string, data: MoveColumnInput) {
    const userBigInt = BigInt(userId);
    const columnBigInt = BigInt(columnId);

    await this.getColumnWithAccess(columnBigInt, userBigInt);

    let newPosition: Prisma.Decimal;

    if (data.targetPosition !== undefined && data.targetPosition !== null) {
      newPosition = new Prisma.Decimal(data.targetPosition.toString());
    } else {
      newPosition = this.calculatePosition(data.prevPosition, data.nextPosition);
    }

    const updated = await prisma.column.update({
      where: { id: columnBigInt },
      data: {
        position: newPosition,
      },
    });

    return updated;
  }

  /**
   * Delete column
   */
  async deleteColumn(userId: string, columnId: string) {
    const userBigInt = BigInt(userId);
    const columnBigInt = BigInt(columnId);

    await this.getColumnWithAccess(columnBigInt, userBigInt);

    await prisma.column.delete({
      where: { id: columnBigInt },
    });

    return { message: 'Column deleted successfully' };
  }
}

export const columnService = new ColumnService();
