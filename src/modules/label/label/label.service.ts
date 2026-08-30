import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import {
  CreateLabelInput,
  UpdateLabelInput,
  GetLabelsQueryInput,
} from './label.validation';

export class LabelService {
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
   * Helper: Get label and verify user access
   */
  async getLabelWithAccess(labelId: bigint, userId: bigint) {
    const label = await prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!label) {
      throw new AppError('Label not found', 404);
    }

    const memberRole = await this.getMemberRole(label.projectId, userId);
    if (!memberRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    return { label, memberRole };
  }

  /**
   * Create a new label in a project
   */
  async createLabel(userId: string, data: CreateLabelInput) {
    const userBigInt = BigInt(userId);
    const projectBigInt = BigInt(data.projectId);

    const memberRole = await this.getMemberRole(projectBigInt, userBigInt);
    if (!memberRole) {
      throw new AppError('Project not found or you are not a member of this project', 403);
    }

    // Check unique name in project
    const existing = await prisma.label.findUnique({
      where: {
        projectId_name: {
          projectId: projectBigInt,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new AppError(`Label with name "${data.name}" already exists in this project`, 409);
    }

    const label = await prisma.label.create({
      data: {
        projectId: projectBigInt,
        name: data.name,
        color: data.color,
      },
    });

    return label;
  }

  /**
   * Get all labels belonging to a project
   */
  async getLabelsByProject(userId: string, query: GetLabelsQueryInput) {
    const userBigInt = BigInt(userId);
    const projectBigInt = BigInt(query.projectId);

    const memberRole = await this.getMemberRole(projectBigInt, userBigInt);
    if (!memberRole) {
      throw new AppError('Project not found or you are not a member of this project', 403);
    }

    const whereClause: Prisma.LabelWhereInput = {
      projectId: projectBigInt,
    };

    if (query.search) {
      whereClause.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const labels = await prisma.label.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            taskLabels: true,
          },
        },
      },
    });

    const formatted = labels.map((l) => ({
      id: l.id,
      projectId: l.projectId,
      name: l.name,
      color: l.color,
      taskCount: l._count.taskLabels,
      createdAt: l.createdAt,
    }));

    return formatted;
  }

  /**
   * Get label details by ID
   */
  async getLabelById(userId: string, labelId: string) {
    const userBigInt = BigInt(userId);
    const labelBigInt = BigInt(labelId);

    const { label } = await this.getLabelWithAccess(labelBigInt, userBigInt);

    const labelWithCount = await prisma.label.findUnique({
      where: { id: labelBigInt },
      include: {
        _count: {
          select: {
            taskLabels: true,
          },
        },
      },
    });

    return {
      id: label.id,
      projectId: label.projectId,
      name: label.name,
      color: label.color,
      taskCount: labelWithCount?._count.taskLabels || 0,
      createdAt: label.createdAt,
    };
  }

  /**
   * Update label (name, color)
   */
  async updateLabel(userId: string, labelId: string, data: UpdateLabelInput) {
    const userBigInt = BigInt(userId);
    const labelBigInt = BigInt(labelId);

    const { label } = await this.getLabelWithAccess(labelBigInt, userBigInt);

    if (data.name && data.name !== label.name) {
      const duplicate = await prisma.label.findUnique({
        where: {
          projectId_name: {
            projectId: label.projectId,
            name: data.name,
          },
        },
      });

      if (duplicate && duplicate.id !== labelBigInt) {
        throw new AppError(`Label with name "${data.name}" already exists in this project`, 409);
      }
    }

    const updated = await prisma.label.update({
      where: { id: labelBigInt },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });

    return updated;
  }

  /**
   * Delete label
   */
  async deleteLabel(userId: string, labelId: string) {
    const userBigInt = BigInt(userId);
    const labelBigInt = BigInt(labelId);

    await this.getLabelWithAccess(labelBigInt, userBigInt);

    await prisma.label.delete({
      where: { id: labelBigInt },
    });

    return { message: 'Label deleted successfully' };
  }
}

export const labelService = new LabelService();
