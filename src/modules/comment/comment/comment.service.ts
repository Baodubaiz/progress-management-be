import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import {
  CreateCommentInput,
  UpdateCommentInput,
  GetCommentsQueryInput,
} from './comment.validation';

export class CommentService {
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
   * Helper: Get task and verify access
   */
  async getTaskWithAccess(taskId: bigint, userId: bigint) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              select: {
                id: true,
                projectId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const projectId = task.column.board.projectId;
    const memberRole = await this.getMemberRole(projectId, userId);
    if (!memberRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    return { task, projectId, memberRole };
  }

  /**
   * Helper: Get comment and verify access
   */
  async getCommentWithAccess(commentId: bigint, userId: bigint) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            column: {
              include: {
                board: {
                  select: {
                    id: true,
                    projectId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    const projectId = comment.task.column.board.projectId;
    const memberRole = await this.getMemberRole(projectId, userId);
    if (!memberRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    return { comment, projectId, memberRole };
  }

  /**
   * Create a new comment on a task
   */
  async createComment(userId: string, data: CreateCommentInput) {
    const userBigInt = BigInt(userId);
    const taskBigInt = BigInt(data.taskId);

    const { projectId } = await this.getTaskWithAccess(taskBigInt, userBigInt);

    const newComment = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          taskId: taskBigInt,
          userId: userBigInt,
          content: data.content,
        },
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
      });

      // Log activity
      await tx.activity.create({
        data: {
          projectId,
          taskId: taskBigInt,
          userId: userBigInt,
          action: 'COMMENT_ADDED',
          newValue: JSON.stringify({
            commentId: comment.id.toString(),
            preview: data.content.substring(0, 100),
          }),
        },
      });

      return comment;
    });

    return newComment;
  }

  /**
   * Get all comments for a task (paginated)
   */
  async getCommentsByTask(userId: string, query: GetCommentsQueryInput) {
    const userBigInt = BigInt(userId);
    const taskBigInt = BigInt(query.taskId);

    await this.getTaskWithAccess(taskBigInt, userBigInt);

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '20', 10));
    const skip = (page - 1) * limit;

    const [total, comments] = await Promise.all([
      prisma.comment.count({ where: { taskId: taskBigInt } }),
      prisma.comment.findMany({
        where: { taskId: taskBigInt },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
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
      }),
    ]);

    return {
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single comment by ID
   */
  async getCommentById(userId: string, commentId: string) {
    const userBigInt = BigInt(userId);
    const commentBigInt = BigInt(commentId);

    const { comment } = await this.getCommentWithAccess(commentBigInt, userBigInt);

    const fullComment = await prisma.comment.findUnique({
      where: { id: commentBigInt },
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
    });

    return fullComment;
  }

  /**
   * Update comment (author only)
   */
  async updateComment(userId: string, commentId: string, data: UpdateCommentInput) {
    const userBigInt = BigInt(userId);
    const commentBigInt = BigInt(commentId);

    const { comment } = await this.getCommentWithAccess(commentBigInt, userBigInt);

    if (comment.userId !== userBigInt) {
      throw new AppError('Only the author can edit this comment', 403);
    }

    const updated = await prisma.comment.update({
      where: { id: commentBigInt },
      data: {
        content: data.content,
      },
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
    });

    return updated;
  }

  /**
   * Delete comment (author or project OWNER)
   */
  async deleteComment(userId: string, commentId: string) {
    const userBigInt = BigInt(userId);
    const commentBigInt = BigInt(commentId);

    const { comment, memberRole } = await this.getCommentWithAccess(commentBigInt, userBigInt);

    if (comment.userId !== userBigInt && memberRole !== 'OWNER') {
      throw new AppError('Only the author or the project owner can delete this comment', 403);
    }

    await prisma.comment.delete({
      where: { id: commentBigInt },
    });

    return { message: 'Comment deleted successfully' };
  }
}

export const commentService = new CommentService();
