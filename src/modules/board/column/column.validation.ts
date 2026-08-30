import { z } from 'zod';

export const createColumnSchema = z.object({
  boardId: z
    .string({ message: 'Board ID is required' })
    .regex(/^\d+$/, 'Board ID must be a numeric ID'),
  name: z
    .string({ message: 'Column name is required' })
    .min(1, 'Column name cannot be empty')
    .max(100, 'Column name cannot exceed 100 characters')
    .trim(),
  position: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)])
    .optional(),
});

export const updateColumnSchema = z.object({
  name: z
    .string()
    .min(1, 'Column name cannot be empty')
    .max(100, 'Column name cannot exceed 100 characters')
    .trim()
    .optional(),
  position: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)])
    .optional(),
});

export const moveColumnSchema = z.object({
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

export const columnIdParamSchema = z.object({
  id: z
    .string({ message: 'Column ID is required' })
    .regex(/^\d+$/, 'Column ID must be a numeric ID'),
});

export const boardIdParamSchema = z.object({
  boardId: z
    .string({ message: 'Board ID is required' })
    .regex(/^\d+$/, 'Board ID must be a numeric ID'),
});

export const getColumnsQuerySchema = z.object({
  boardId: z
    .string({ message: 'Board ID is required' })
    .regex(/^\d+$/, 'Board ID must be a numeric ID'),
});

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type MoveColumnInput = z.infer<typeof moveColumnSchema>;
export type ColumnIdParamInput = z.infer<typeof columnIdParamSchema>;
export type BoardIdParamInput = z.infer<typeof boardIdParamSchema>;
export type GetColumnsQueryInput = z.infer<typeof getColumnsQuerySchema>;
