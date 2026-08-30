import { z } from 'zod';
import { ActivityAction } from '@prisma/client';

export const getActivitiesQuerySchema = z.object({
  projectId: z
    .string({ message: 'Project ID is required' })
    .regex(/^\d+$/, 'Project ID must be a numeric ID'),
  taskId: z
    .string()
    .regex(/^\d+$/, 'Task ID must be a numeric ID')
    .optional(),
  userId: z
    .string()
    .regex(/^\d+$/, 'User ID must be a numeric ID')
    .optional(),
  action: z
    .nativeEnum(ActivityAction, {
      message: 'Action must be a valid ActivityAction value',
    })
    .optional(),
  from: z
    .string()
    .datetime({ message: 'from must be a valid ISO 8601 date string' })
    .optional(),
  to: z
    .string()
    .datetime({ message: 'to must be a valid ISO 8601 date string' })
    .optional(),
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

export const activityIdParamSchema = z.object({
  id: z
    .string({ message: 'Activity ID is required' })
    .regex(/^\d+$/, 'Activity ID must be a numeric ID'),
});

export type GetActivitiesQueryInput = z.infer<typeof getActivitiesQuerySchema>;
export type ActivityIdParamInput = z.infer<typeof activityIdParamSchema>;
