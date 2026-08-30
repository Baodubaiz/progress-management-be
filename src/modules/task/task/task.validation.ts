import { z } from 'zod';
import { TaskPriority } from '@prisma/client';

export const createTaskSchema = z.object({
  columnId: z
    .string({ message: 'Column ID is required' })
    .regex(/^\d+$/, 'Column ID must be a numeric ID'),
  title: z
    .string({ message: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(255, 'Title cannot exceed 255 characters')
    .trim(),
  description: z
    .string()
    .max(10000, 'Description cannot exceed 10000 characters')
    .optional()
    .nullable(),
  priority: z
    .nativeEnum(TaskPriority, {
      message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
    })
    .optional()
    .default(TaskPriority.MEDIUM),
  dueDate: z
    .string()
    .datetime({ message: 'Due date must be a valid ISO 8601 date string' })
    .optional()
    .nullable(),
  position: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)])
    .optional(),
  assigneeIds: z
    .array(z.string().regex(/^\d+$/, 'Assignee ID must be a numeric ID'))
    .optional(),
  labelIds: z
    .array(z.string().regex(/^\d+$/, 'Label ID must be a numeric ID'))
    .optional(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title cannot exceed 255 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(10000, 'Description cannot exceed 10000 characters')
    .optional()
    .nullable(),
  priority: z
    .nativeEnum(TaskPriority, {
      message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
    })
    .optional(),
  dueDate: z
    .string()
    .datetime({ message: 'Due date must be a valid ISO 8601 date string' })
    .optional()
    .nullable(),
  version: z
    .number({ message: 'Version must be a number' })
    .int('Version must be an integer')
    .positive('Version must be a positive integer')
    .optional(),
  assigneeIds: z
    .array(z.string().regex(/^\d+$/, 'Assignee ID must be a numeric ID'))
    .optional(),
  labelIds: z
    .array(z.string().regex(/^\d+$/, 'Label ID must be a numeric ID'))
    .optional(),
});

export const moveTaskSchema = z.object({
  columnId: z
    .string({ message: 'Target column ID is required' })
    .regex(/^\d+$/, 'Column ID must be a numeric ID')
    .optional(),
  prevPosition: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)])
    .optional()
    .nullable(),
  nextPosition: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)])
    .optional()
    .nullable(),
  targetPosition: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)])
    .optional()
    .nullable(),
});

export const addAssigneesSchema = z
  .object({
    userIds: z
      .array(z.string().regex(/^\d+$/, 'User ID must be a numeric ID'))
      .min(1, 'At least one user ID is required')
      .optional(),
    userId: z
      .string()
      .regex(/^\d+$/, 'User ID must be a numeric ID')
      .optional(),
  })
  .refine((data) => data.userIds || data.userId, {
    message: 'Either userId or userIds must be provided',
  });

export const addLabelsSchema = z
  .object({
    labelIds: z
      .array(z.string().regex(/^\d+$/, 'Label ID must be a numeric ID'))
      .min(1, 'At least one label ID is required')
      .optional(),
    labelId: z
      .string()
      .regex(/^\d+$/, 'Label ID must be a numeric ID')
      .optional(),
  })
  .refine((data) => data.labelIds || data.labelId, {
    message: 'Either labelId or labelIds must be provided',
  });

export const taskIdParamSchema = z.object({
  id: z
    .string({ message: 'Task ID is required' })
    .regex(/^\d+$/, 'Task ID must be a numeric ID'),
});

export const removeAssigneeParamsSchema = z.object({
  id: z
    .string({ message: 'Task ID is required' })
    .regex(/^\d+$/, 'Task ID must be a numeric ID'),
  userId: z
    .string({ message: 'User ID is required' })
    .regex(/^\d+$/, 'User ID must be a numeric ID'),
});

export const removeLabelParamsSchema = z.object({
  id: z
    .string({ message: 'Task ID is required' })
    .regex(/^\d+$/, 'Task ID must be a numeric ID'),
  labelId: z
    .string({ message: 'Label ID is required' })
    .regex(/^\d+$/, 'Label ID must be a numeric ID'),
});

export const getTasksQuerySchema = z.object({
  columnId: z
    .string()
    .regex(/^\d+$/, 'Column ID must be a numeric ID')
    .optional(),
  boardId: z
    .string()
    .regex(/^\d+$/, 'Board ID must be a numeric ID')
    .optional(),
  projectId: z
    .string()
    .regex(/^\d+$/, 'Project ID must be a numeric ID')
    .optional(),
  priority: z
    .nativeEnum(TaskPriority)
    .optional(),
  assigneeId: z
    .string()
    .regex(/^\d+$/, 'Assignee ID must be a numeric ID')
    .optional(),
  search: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive integer')
    .optional()
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .optional()
    .default('20'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type AddAssigneesInput = z.infer<typeof addAssigneesSchema>;
export type AddLabelsInput = z.infer<typeof addLabelsSchema>;
export type TaskIdParamInput = z.infer<typeof taskIdParamSchema>;
export type RemoveAssigneeParamsInput = z.infer<typeof removeAssigneeParamsSchema>;
export type RemoveLabelParamsInput = z.infer<typeof removeLabelParamsSchema>;
export type GetTasksQueryInput = z.infer<typeof getTasksQuerySchema>;
