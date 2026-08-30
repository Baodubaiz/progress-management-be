import { Prisma, TaskPriority } from '@prisma/client';
import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import {
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  AddAssigneesInput,
  AddLabelsInput,
  GetTasksQueryInput,
} from './task.validation';

const POSITION_GAP = 65535;

export class TaskService {
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
   * Helper: Get column and verify user has access to its project
   */
  async getColumnWithAccess(columnId: bigint, userId: bigint) {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          select: {
            id: true,
            projectId: true,
            createdBy: true,
          },
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

    return { column, projectId: column.board.projectId, memberRole };
  }

  /**
   * Helper: Get task and verify user access
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
                createdBy: true,
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
   * Helper: Fractional index calculation
   */
  calculatePosition(
    prevPos?: string | number | null,
    nextPos?: string | number | null
  ): Prisma.Decimal {
    const prev = prevPos != null ? new Prisma.Decimal(prevPos.toString()) : null;
    const next = nextPos != null ? new Prisma.Decimal(nextPos.toString()) : null;

    if (prev && next) {
      return prev.add(next).dividedBy(2);
    } else if (prev && !next) {
      return prev.add(POSITION_GAP);
    } else if (!prev && next) {
      return next.dividedBy(2);
    } else {
      return new Prisma.Decimal(POSITION_GAP);
    }
  }

  /**
   * Create a new task
   */
  async createTask(userId: string, data: CreateTaskInput) {
    const userBigInt = BigInt(userId);
    const columnBigInt = BigInt(data.columnId);

    const { projectId } = await this.getColumnWithAccess(columnBigInt, userBigInt);

    // Validate assignees belong to project
    let assigneeBigInts: bigint[] = [];
    if (data.assigneeIds && data.assigneeIds.length > 0) {
      assigneeBigInts = data.assigneeIds.map((id) => BigInt(id));
      const members = await prisma.projectMember.findMany({
        where: {
          projectId,
          userId: { in: assigneeBigInts },
        },
        select: { userId: true },
      });

      if (members.length !== assigneeBigInts.length) {
        throw new AppError(
          'One or more assignees are not members of this project',
          400
        );
      }
    }

    // Validate labels belong to project
    let labelBigInts: bigint[] = [];
    if (data.labelIds && data.labelIds.length > 0) {
      labelBigInts = data.labelIds.map((id) => BigInt(id));
      const validLabels = await prisma.label.findMany({
        where: {
          projectId,
          id: { in: labelBigInts },
        },
        select: { id: true },
      });

      if (validLabels.length !== labelBigInts.length) {
        throw new AppError(
          'One or more labels do not belong to this project',
          400
        );
      }
    }

    // Determine position
    let position: Prisma.Decimal;
    if (data.position !== undefined) {
      position = new Prisma.Decimal(data.position.toString());
    } else {
      const lastTask = await prisma.task.findFirst({
        where: { columnId: columnBigInt },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      position = lastTask ? lastTask.position.add(POSITION_GAP) : new Prisma.Decimal(POSITION_GAP);
    }

    const newTask = await prisma.$transaction(async (tx) => {
      // 1. Create task
      const task = await tx.task.create({
        data: {
          columnId: columnBigInt,
          title: data.title,
          description: data.description,
          position,
          priority: data.priority || TaskPriority.MEDIUM,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          createdBy: userBigInt,
        },
      });

      // 2. Add assignees
      if (assigneeBigInts.length > 0) {
        await tx.taskAssignee.createMany({
          data: assigneeBigInts.map((assigneeId) => ({
            taskId: task.id,
            userId: assigneeId,
          })),
        });
      }

      // 3. Add labels
      if (labelBigInts.length > 0) {
        await tx.taskLabel.createMany({
          data: labelBigInts.map((labelId) => ({
            taskId: task.id,
            labelId,
          })),
        });
      }

      // 4. Log activity
      await tx.activity.create({
        data: {
          projectId,
          taskId: task.id,
          userId: userBigInt,
          action: 'TASK_CREATED',
          newValue: JSON.stringify({
            title: task.title,
            priority: task.priority,
            columnId: task.columnId.toString(),
          }),
        },
      });

      // 5. Fetch full task response
      return tx.task.findUnique({
        where: { id: task.id },
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
        },
      });
    });

    return newTask;
  }

  /**
   * Get filtered tasks list
   */
  async getTasks(userId: string, query: GetTasksQueryInput) {
    const userBigInt = BigInt(userId);
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '20', 10));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput = {};

    if (query.columnId) {
      const columnBigInt = BigInt(query.columnId);
      await this.getColumnWithAccess(columnBigInt, userBigInt);
      whereClause.columnId = columnBigInt;
    } else if (query.boardId) {
      const boardBigInt = BigInt(query.boardId);
      const board = await prisma.board.findUnique({
        where: { id: boardBigInt },
        select: { projectId: true },
      });
      if (!board) throw new AppError('Board not found', 404);
      const role = await this.getMemberRole(board.projectId, userBigInt);
      if (!role) throw new AppError('Access denied', 403);

      whereClause.column = { boardId: boardBigInt };
    } else if (query.projectId) {
      const projectBigInt = BigInt(query.projectId);
      const role = await this.getMemberRole(projectBigInt, userBigInt);
      if (!role) throw new AppError('Access denied', 403);

      whereClause.column = {
        board: { projectId: projectBigInt },
      };
    } else {
      // Must belong to projects user is in
      whereClause.column = {
        board: {
          project: {
            members: {
              some: { userId: userBigInt },
            },
          },
        },
      };
    }

    if (query.priority) {
      whereClause.priority = query.priority;
    }

    if (query.assigneeId) {
      whereClause.assignees = {
        some: { userId: BigInt(query.assigneeId) },
      };
    }

    if (query.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where: whereClause }),
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
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
      }),
    ]);

    return {
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single task details
   */
  async getTaskById(userId: string, taskId: string) {
    const userBigInt = BigInt(userId);
    const taskBigInt = BigInt(taskId);

    const { projectId } = await this.getTaskWithAccess(taskBigInt, userBigInt);

    const task = await prisma.task.findUnique({
      where: { id: taskBigInt },
      include: {
        column: {
          select: {
            id: true,
            name: true,
            board: {
              select: {
                id: true,
                name: true,
                projectId: true,
              },
            },
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
        comments: {
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
        },
      },
    });

    return task;
  }

  /**
   * Update task metadata (with optional optimistic lock check & assignee/label syncing)
   */
  async updateTask(userId: string, taskId: string, data: UpdateTaskInput) {
    const userBigInt = BigInt(userId);
    const taskBigInt = BigInt(taskId);

    const { task, projectId } = await this.getTaskWithAccess(taskBigInt, userBigInt);

    // Optimistic Concurrency Control
    if (data.version !== undefined && data.version !== task.version) {
      throw new AppError(
        'Task has been modified by another user. Please refresh and try again.',
        409
      );
    }

    // Validate assignees if provided
    let assigneeBigInts: bigint[] | undefined = undefined;
    if (data.assigneeIds !== undefined) {
      assigneeBigInts = data.assigneeIds.map((id) => BigInt(id));
      if (assigneeBigInts.length > 0) {
        const members = await prisma.projectMember.findMany({
          where: {
            projectId,
            userId: { in: assigneeBigInts },
          },
          select: { userId: true },
        });

        if (members.length !== assigneeBigInts.length) {
          throw new AppError(
            'One or more assignees are not members of this project',
            400
          );
        }
      }
    }

    // Validate labels if provided
    let labelBigInts: bigint[] | undefined = undefined;
    if (data.labelIds !== undefined) {
      labelBigInts = data.labelIds.map((id) => BigInt(id));
      if (labelBigInts.length > 0) {
        const validLabels = await prisma.label.findMany({
          where: {
            projectId,
            id: { in: labelBigInts },
          },
          select: { id: true },
        });

        if (validLabels.length !== labelBigInts.length) {
          throw new AppError(
            'One or more labels do not belong to this project',
            400
          );
        }
      }
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      // 1. Update basic fields
      const updated = await tx.task.update({
        where: { id: taskBigInt },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          }),
          version: { increment: 1 },
        },
      });

      // 2. Sync assignees if provided
      if (assigneeBigInts !== undefined) {
        await tx.taskAssignee.deleteMany({
          where: { taskId: taskBigInt },
        });

        if (assigneeBigInts.length > 0) {
          await tx.taskAssignee.createMany({
            data: assigneeBigInts.map((assigneeId) => ({
              taskId: taskBigInt,
              userId: assigneeId,
            })),
          });
        }
      }

      // 3. Sync labels if provided
      if (labelBigInts !== undefined) {
        await tx.taskLabel.deleteMany({
          where: { taskId: taskBigInt },
        });

        if (labelBigInts.length > 0) {
          await tx.taskLabel.createMany({
            data: labelBigInts.map((labelId) => ({
              taskId: taskBigInt,
              labelId,
            })),
          });
        }
      }

      // 4. Log activity
      await tx.activity.create({
        data: {
          projectId,
          taskId: taskBigInt,
          userId: userBigInt,
          action: 'TASK_UPDATED',
          oldValue: JSON.stringify({
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate,
          }),
          newValue: JSON.stringify({
            title: updated.title,
            priority: updated.priority,
            dueDate: updated.dueDate,
          }),
        },
      });

      // 5. Return updated task with all relations
      return tx.task.findUnique({
        where: { id: taskBigInt },
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
        },
      });
    });

    return updatedTask;
  }

  /**
   * Move task (change column and/or fractional position)
   */
  async moveTask(userId: string, taskId: string, data: MoveTaskInput) {
    const userBigInt = BigInt(userId);
    const taskBigInt = BigInt(taskId);

    const { task, projectId } = await this.getTaskWithAccess(taskBigInt, userBigInt);

    let targetColumnId = task.columnId;
    if (data.columnId) {
      const colBigInt = BigInt(data.columnId);
      const targetColumn = await this.getColumnWithAccess(colBigInt, userBigInt);

      if (targetColumn.projectId !== projectId) {
        throw new AppError('Cannot move task across different projects', 400);
      }
      targetColumnId = colBigInt;
    }

    let newPosition: Prisma.Decimal;
    if (data.targetPosition !== undefined && data.targetPosition !== null) {
      newPosition = new Prisma.Decimal(data.targetPosition.toString());
    } else {
      newPosition = this.calculatePosition(data.prevPosition, data.nextPosition);
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const moved = await tx.task.update({
        where: { id: taskBigInt },
        data: {
          columnId: targetColumnId,
          position: newPosition,
          version: { increment: 1 },
        },
        include: {
          column: {
            select: { id: true, name: true },
          },
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
        },
      });

      // Log activity if moved
      await tx.activity.create({
        data: {
          projectId,
          taskId: taskBigInt,
          userId: userBigInt,
          action: 'TASK_MOVED',
          oldValue: JSON.stringify({
            columnId: task.columnId.toString(),
            position: task.position.toString(),
          }),
          newValue: JSON.stringify({
            columnId: targetColumnId.toString(),
            position: newPosition.toString(),
          }),
        },
      });

      return moved;
    });

    return updatedTask;
  }

  /**
   * Delete task
   */
  async deleteTask(userId: string, taskId: string) {
    const userBigInt = BigInt(userId);
    const taskBigInt = BigInt(taskId);

    const { task, memberRole } = await this.getTaskWithAccess(taskBigInt, userBigInt);

    // Only project OWNER or task creator can delete
    if (memberRole !== 'OWNER' && task.createdBy !== userBigInt) {
      throw new AppError('Only project owners or the task creator can delete this task', 403);
    }

    await prisma.task.delete({
      where: { id: taskBigInt },
    });

    return { message: 'Task deleted successfully' };
  }

  // ==============================================
  // ASSIGNEE OPERATIONS (Junction table helper logic)
  // ==============================================

  /**
   * Get all assignees of a task
   */
  async getAssignees(requesterId: string, taskId: string) {
    const requesterBigInt = BigInt(requesterId);
    const taskBigInt = BigInt(taskId);

    await this.getTaskWithAccess(taskBigInt, requesterBigInt);

    const assignees = await prisma.taskAssignee.findMany({
      where: { taskId: taskBigInt },
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
      orderBy: { assignedAt: 'asc' },
    });

    return assignees;
  }

  /**
   * Add assignees to a task
   */
  async addAssignees(
    requesterId: string,
    taskId: string,
    data: AddAssigneesInput
  ) {
    const requesterBigInt = BigInt(requesterId);
    const taskBigInt = BigInt(taskId);

    const { projectId } = await this.getTaskWithAccess(taskBigInt, requesterBigInt);

    const targetUserIds = data.userIds
      ? data.userIds.map((id) => BigInt(id))
      : data.userId
      ? [BigInt(data.userId)]
      : [];

    if (targetUserIds.length === 0) {
      throw new AppError('No users specified to assign', 400);
    }

    // Verify all target users are members of the project
    const validMembers = await prisma.projectMember.findMany({
      where: {
        projectId,
        userId: { in: targetUserIds },
      },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    if (validMembers.length !== targetUserIds.length) {
      throw new AppError('One or more selected users are not members of this project', 400);
    }

    // Check currently assigned users
    const existingAssignees = await prisma.taskAssignee.findMany({
      where: {
        taskId: taskBigInt,
        userId: { in: targetUserIds },
      },
      select: { userId: true },
    });

    const existingSet = new Set(existingAssignees.map((a) => a.userId.toString()));
    const newAssigneesToAdd = targetUserIds.filter(
      (id) => !existingSet.has(id.toString())
    );

    if (newAssigneesToAdd.length === 0) {
      throw new AppError('All specified users are already assigned to this task', 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.taskAssignee.createMany({
        data: newAssigneesToAdd.map((userId) => ({
          taskId: taskBigInt,
          userId,
        })),
      });

      // Log activity
      const assignedUsers = validMembers.filter((m) =>
        newAssigneesToAdd.includes(m.userId)
      );

      for (const member of assignedUsers) {
        await tx.activity.create({
          data: {
            projectId,
            taskId: taskBigInt,
            userId: requesterBigInt,
            action: 'TASK_ASSIGNED',
            newValue: JSON.stringify({
              userId: member.userId.toString(),
              username: member.user.username,
            }),
          },
        });
      }

      return tx.taskAssignee.findMany({
        where: { taskId: taskBigInt },
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
        orderBy: { assignedAt: 'asc' },
      });
    });

    return result;
  }

  /**
   * Remove an assignee from a task
   */
  async removeAssignee(
    requesterId: string,
    taskId: string,
    targetUserId: string
  ) {
    const requesterBigInt = BigInt(requesterId);
    const taskBigInt = BigInt(taskId);
    const targetUserBigInt = BigInt(targetUserId);

    const { projectId } = await this.getTaskWithAccess(taskBigInt, requesterBigInt);

    const existingAssignee = await prisma.taskAssignee.findUnique({
      where: {
        taskId_userId: {
          taskId: taskBigInt,
          userId: targetUserBigInt,
        },
      },
    });

    if (!existingAssignee) {
      throw new AppError('User is not assigned to this task', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.taskAssignee.delete({
        where: {
          taskId_userId: {
            taskId: taskBigInt,
            userId: targetUserBigInt,
          },
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          projectId,
          taskId: taskBigInt,
          userId: requesterBigInt,
          action: 'TASK_UNASSIGNED',
          oldValue: JSON.stringify({
            userId: targetUserBigInt.toString(),
          }),
        },
      });
    });

    return { message: 'Assignee removed successfully from the task' };
  }

  // ==============================================
  // LABEL OPERATIONS (Junction table helper logic)
  // ==============================================

  /**
   * Get all labels of a task
   */
  async getTaskLabels(requesterId: string, taskId: string) {
    const requesterBigInt = BigInt(requesterId);
    const taskBigInt = BigInt(taskId);

    await this.getTaskWithAccess(taskBigInt, requesterBigInt);

    const taskLabels = await prisma.taskLabel.findMany({
      where: { taskId: taskBigInt },
      include: {
        label: true,
      },
    });

    return taskLabels.map((tl) => tl.label);
  }

  /**
   * Add labels to a task
   */
  async addTaskLabels(
    requesterId: string,
    taskId: string,
    data: AddLabelsInput
  ) {
    const requesterBigInt = BigInt(requesterId);
    const taskBigInt = BigInt(taskId);

    const { projectId } = await this.getTaskWithAccess(taskBigInt, requesterBigInt);

    const targetLabelIds = data.labelIds
      ? data.labelIds.map((id) => BigInt(id))
      : data.labelId
      ? [BigInt(data.labelId)]
      : [];

    if (targetLabelIds.length === 0) {
      throw new AppError('No labels specified to add', 400);
    }

    // Verify all target labels belong to the project
    const validLabels = await prisma.label.findMany({
      where: {
        projectId,
        id: { in: targetLabelIds },
      },
      select: { id: true },
    });

    if (validLabels.length !== targetLabelIds.length) {
      throw new AppError('One or more selected labels do not belong to this project', 400);
    }

    // Check existing labels on task
    const existingLabels = await prisma.taskLabel.findMany({
      where: {
        taskId: taskBigInt,
        labelId: { in: targetLabelIds },
      },
      select: { labelId: true },
    });

    const existingSet = new Set(existingLabels.map((l) => l.labelId.toString()));
    const newLabelsToAdd = targetLabelIds.filter(
      (id) => !existingSet.has(id.toString())
    );

    if (newLabelsToAdd.length === 0) {
      throw new AppError('All specified labels are already assigned to this task', 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.taskLabel.createMany({
        data: newLabelsToAdd.map((labelId) => ({
          taskId: taskBigInt,
          labelId,
        })),
      });

      return tx.taskLabel.findMany({
        where: { taskId: taskBigInt },
        include: {
          label: true,
        },
      });
    });

    return result.map((tl) => tl.label);
  }

  /**
   * Remove a label from a task
   */
  async removeTaskLabel(
    requesterId: string,
    taskId: string,
    targetLabelId: string
  ) {
    const requesterBigInt = BigInt(requesterId);
    const taskBigInt = BigInt(taskId);
    const labelBigInt = BigInt(targetLabelId);

    await this.getTaskWithAccess(taskBigInt, requesterBigInt);

    const existing = await prisma.taskLabel.findUnique({
      where: {
        taskId_labelId: {
          taskId: taskBigInt,
          labelId: labelBigInt,
        },
      },
    });

    if (!existing) {
      throw new AppError('Label is not assigned to this task', 404);
    }

    await prisma.taskLabel.delete({
      where: {
        taskId_labelId: {
          taskId: taskBigInt,
          labelId: labelBigInt,
        },
      },
    });

    return { message: 'Label removed successfully from the task' };
  }
}

export const taskService = new TaskService();
