import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import {
  CreateProjectInput,
  UpdateProjectInput,
  GetProjectsQueryInput,
} from './project.validation';

export class ProjectService {
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
   * Create a new project and automatically assign creator as OWNER
   */
  async createProject(userId: string, data: CreateProjectInput) {
    const userBigInt = BigInt(userId);

    // Create project and owner member record in transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          createdBy: userBigInt,
          members: {
            create: {
              userId: userBigInt,
              role: 'OWNER',
            },
          },
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
          members: {
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
        },
      });

      return newProject;
    });

    return project;
  }

  /**
   * Get all projects where the user is a member/owner
   */
  async getProjects(userId: string, query: GetProjectsQueryInput) {
    const userBigInt = BigInt(userId);
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      members: {
        some: {
          userId: userBigInt,
        },
      },
    };

    if (query.search) {
      whereClause.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.project.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
          members: {
            where: { userId: userBigInt },
            select: { role: true },
          },
          _count: {
            select: {
              members: true,
              boards: true,
            },
          },
        },
      }),
    ]);

    // Format output with user role and counts
    const formattedProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdBy: p.createdBy,
      creator: p.creator,
      userRole: p.members[0]?.role || 'MEMBER',
      membersCount: p._count.members,
      boardsCount: p._count.boards,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return {
      projects: formattedProjects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get project details by ID (must be a project member)
   */
  async getProjectById(userId: string, projectId: string) {
    const userBigInt = BigInt(userId);
    const projectBigInt = BigInt(projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectBigInt },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
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
          orderBy: { joinedAt: 'asc' },
        },
        boards: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            _count: {
              select: { columns: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        labels: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Check membership
    const memberRecord = project.members.find((m) => m.userId === userBigInt);
    if (!memberRecord) {
      throw new AppError('Access denied. You are not a member of this project.', 403);
    }

    return {
      ...project,
      userRole: memberRecord.role,
    };
  }

  /**
   * Update project details (Only OWNER can update)
   */
  async updateProject(userId: string, projectId: string, data: UpdateProjectInput) {
    const userBigInt = BigInt(userId);
    const projectBigInt = BigInt(projectId);

    const role = await this.getMemberRole(projectBigInt, userBigInt);
    if (!role) {
      throw new AppError('Project not found or you are not a member', 404);
    }

    if (role !== 'OWNER') {
      throw new AppError('Only project owners can update project details', 403);
    }

    const updated = await prisma.project.update({
      where: { id: projectBigInt },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    return updated;
  }

  /**
   * Delete project (Only OWNER can delete)
   */
  async deleteProject(userId: string, projectId: string) {
    const userBigInt = BigInt(userId);
    const projectBigInt = BigInt(projectId);

    const role = await this.getMemberRole(projectBigInt, userBigInt);
    if (!role) {
      throw new AppError('Project not found or you are not a member', 404);
    }

    if (role !== 'OWNER') {
      throw new AppError('Only project owners can delete this project', 403);
    }

    await prisma.project.delete({
      where: { id: projectBigInt },
    });

    return { message: 'Project deleted successfully' };
  }
}

export const projectService = new ProjectService();

