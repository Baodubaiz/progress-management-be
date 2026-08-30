import { z } from 'zod';

export const createBoardSchema = z.object({
  projectId: z
    .string({ message: 'Project ID is required' })
    .regex(/^\d+$/, 'Project ID must be a numeric ID'),
  name: z
    .string({ message: 'Board name is required' })
    .min(1, 'Board name cannot be empty')
    .max(150, 'Board name cannot exceed 150 characters')
    .trim(),
  description: z
    .string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional()
    .nullable(),
  initialColumns: z
    .array(z.string().min(1).max(100).trim())
    .optional(),
});

export const updateBoardSchema = z.object({
  name: z
    .string()
    .min(1, 'Board name cannot be empty')
    .max(150, 'Board name cannot exceed 150 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional()
    .nullable(),
});

export const boardIdParamSchema = z.object({
  id: z
    .string({ message: 'Board ID is required' })
    .regex(/^\d+$/, 'Board ID must be a numeric ID'),
});

export const getBoardsQuerySchema = z.object({
  projectId: z
    .string({ message: 'Project ID is required' })
    .regex(/^\d+$/, 'Project ID must be a numeric ID'),
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive integer')
    .optional()
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .optional()
    .default('10'),
  search: z.string().optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type BoardIdParamInput = z.infer<typeof boardIdParamSchema>;
export type GetBoardsQueryInput = z.infer<typeof getBoardsQuerySchema>;
