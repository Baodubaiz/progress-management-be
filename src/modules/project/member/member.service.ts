import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import { AddMemberInput, UpdateMemberRoleInput } from './member.validation';

export class MemberService {
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
   * Get all members of a project
   */
  async getMembers(requesterId: string, projectId: string) {
    const userBigInt = BigInt(requesterId);
    const projectBigInt = BigInt(projectId);

    const requesterRole = await this.getMemberRole(projectBigInt, userBigInt);
    if (!requesterRole) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: projectBigInt },
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
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return members;
  }

  /**
   * Add a member to a project by email (Only OWNER can add)
   */
  async addMember(requesterId: string, projectId: string, data: AddMemberInput) {
    const requesterBigInt = BigInt(requesterId);
    const projectBigInt = BigInt(projectId);

    // Verify requester is OWNER
    const requesterRole = await this.getMemberRole(projectBigInt, requesterBigInt);
    if (!requesterRole) {
      throw new AppError('Project not found or you are not a member', 404);
    }

    if (requesterRole !== 'OWNER') {
      throw new AppError('Only project owners can add members', 403);
    }

    // Find target user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!targetUser) {
      throw new AppError(`User with email "${data.email}" not found`, 404);
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: projectBigInt,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      throw new AppError('User is already a member of this project', 409);
    }

    // Add member & log activity in transaction
    const newMember = await prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.create({
        data: {
          projectId: projectBigInt,
          userId: targetUser.id,
          role: data.role,
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

      // Record Activity Log
      await tx.activity.create({
        data: {
          projectId: projectBigInt,
          userId: requesterBigInt,
          action: 'MEMBER_ADDED',
          newValue: JSON.stringify({
            userId: targetUser.id.toString(),
            username: targetUser.username,
            role: data.role,
          }),
        },
      });

      return member;
    });

    return newMember;
  }

  /**
   * Update member role (Only OWNER can update roles)
   */
  async updateMemberRole(
    requesterId: string,
    projectId: string,
    targetUserId: string,
    data: UpdateMemberRoleInput
  ) {
    const requesterBigInt = BigInt(requesterId);
    const projectBigInt = BigInt(projectId);
    const targetUserBigInt = BigInt(targetUserId);

    const requesterRole = await this.getMemberRole(projectBigInt, requesterBigInt);
    if (!requesterRole) {
      throw new AppError('Project not found or you are not a member', 404);
    }

    if (requesterRole !== 'OWNER') {
      throw new AppError('Only project owners can change member roles', 403);
    }

    const targetMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: projectBigInt,
          userId: targetUserBigInt,
        },
      },
    });

    if (!targetMember) {
      throw new AppError('Target member is not found in this project', 404);
    }

    // If demoting an OWNER to MEMBER, ensure at least one other OWNER exists
    if (targetMember.role === 'OWNER' && data.role === 'MEMBER') {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId: projectBigInt,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        throw new AppError(
          'Cannot demote the last owner. Assign another owner before demoting.',
          400
        );
      }
    }

    const updated = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId: projectBigInt,
          userId: targetUserBigInt,
        },
      },
      data: {
        role: data.role,
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
   * Remove member or Leave project
   */
  async removeMember(requesterId: string, projectId: string, targetUserId: string) {
    const requesterBigInt = BigInt(requesterId);
    const projectBigInt = BigInt(projectId);
    const targetUserBigInt = BigInt(targetUserId);

    const requesterRole = await this.getMemberRole(projectBigInt, requesterBigInt);
    if (!requesterRole) {
      throw new AppError('Project not found or you are not a member', 404);
    }

    const isSelfLeaving = requesterBigInt === targetUserBigInt;

    // Only OWNER can remove others; members can only remove themselves (leave project)
    if (!isSelfLeaving && requesterRole !== 'OWNER') {
      throw new AppError('Only project owners can remove other members', 403);
    }

    const targetMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: projectBigInt,
          userId: targetUserBigInt,
        },
      },
    });

    if (!targetMember) {
      throw new AppError('Target member not found in this project', 404);
    }

    // If the leaving user is an OWNER, ensure other owners exist
    if (targetMember.role === 'OWNER') {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId: projectBigInt,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        throw new AppError(
          'The last project owner cannot leave the project. Please transfer ownership or delete the project.',
          400
        );
      }
    }

    // Remove member and log activity in transaction
    await prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({
        where: {
          projectId_userId: {
            projectId: projectBigInt,
            userId: targetUserBigInt,
          },
        },
      });

      // Remove task assignees for this user in this project
      await tx.taskAssignee.deleteMany({
        where: {
          userId: targetUserBigInt,
          task: {
            column: {
              board: {
                projectId: projectBigInt,
              },
            },
          },
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          projectId: projectBigInt,
          userId: requesterBigInt,
          action: 'MEMBER_REMOVED',
          oldValue: JSON.stringify({
            userId: targetUserBigInt.toString(),
            role: targetMember.role,
          }),
        },
      });
    });

    return {
      message: isSelfLeaving
        ? 'You have successfully left the project'
        : 'Member removed successfully from the project',
    };
  }
}

export const memberService = new MemberService();

