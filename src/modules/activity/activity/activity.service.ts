import { ActivityAction } from '@prisma/client';
import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import {
  GetActivitiesQueryInput,
} from './activity.validation';

export class ActivityService {
  /**
   * Helper: Verify project membership
   */
  private async assertProjectMember(projectId: bigint, userId: bigint) {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    if (!member) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }
    return member;
  }

  /**
   * Get paginated activity log for a project
   * Supports optional filters: taskId, userId, action, date range
   */
  async getActivities(requesterId: string, query: GetActivitiesQueryInput) {
    const requesterBigInt = BigInt(requesterId);
    const projectBigInt = BigInt(query.projectId);

    await this.assertProjectMember(projectBigInt, requesterBigInt);

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: {
      projectId: bigint;
      taskId?: bigint;
      userId?: bigint;
      action?: ActivityAction;
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      projectId: projectBigInt,
    };

    if (query.taskId) {
      where.taskId = BigInt(query.taskId);
    }

    if (query.userId) {
      where.userId = BigInt(query.userId);
    }

    if (query.action) {
      where.action = query.action as ActivityAction;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single activity by ID (requester must be project member)
   */
  async getActivityById(requesterId: string, activityId: string) {
    const requesterBigInt = BigInt(requesterId);
    const activityBigInt = BigInt(activityId);

    const activity = await prisma.activity.findUnique({
      where: { id: activityBigInt },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    await this.assertProjectMember(activity.projectId, requesterBigInt);

    return activity;
  }
}

export const activityService = new ActivityService();
