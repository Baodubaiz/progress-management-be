import { z } from 'zod';

export const createCommentSchema = z.object({
  taskId: z
    .string({ message: 'Task ID is required' })
    .regex(/^\d+$/, 'Task ID must be a numeric ID'),
  content: z
    .string({ message: 'Comment content is required' })
    .min(1, 'Comment content cannot be empty')
    .max(10000, 'Comment content cannot exceed 10000 characters')
    .trim(),
});

export const updateCommentSchema = z.object({
  content: z
    .string({ message: 'Comment content is required' })
    .min(1, 'Comment content cannot be empty')
    .max(10000, 'Comment content cannot exceed 10000 characters')
    .trim(),
});

export const commentIdParamSchema = z.object({
  id: z
    .string({ message: 'Comment ID is required' })
    .regex(/^\d+$/, 'Comment ID must be a numeric ID'),
});

export const taskIdParamSchema = z.object({
  taskId: z
    .string({ message: 'Task ID is required' })
    .regex(/^\d+$/, 'Task ID must be a numeric ID'),
});

export const getCommentsQuerySchema = z.object({
  taskId: z
    .string({ message: 'Task ID is required' })
    .regex(/^\d+$/, 'Task ID must be a numeric ID'),
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

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentIdParamInput = z.infer<typeof commentIdParamSchema>;
export type TaskIdParamInput = z.infer<typeof taskIdParamSchema>;
export type GetCommentsQueryInput = z.infer<typeof getCommentsQuerySchema>;
