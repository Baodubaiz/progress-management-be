import { z } from 'zod';

export const createLabelSchema = z.object({
  projectId: z
    .string({ message: 'Project ID is required' })
    .regex(/^\d+$/, 'Project ID must be a numeric ID'),
  name: z
    .string({ message: 'Label name is required' })
    .min(1, 'Label name cannot be empty')
    .max(50, 'Label name cannot exceed 50 characters')
    .trim(),
  color: z
    .string({ message: 'Label color is required' })
    .min(1, 'Label color cannot be empty')
    .max(20, 'Label color cannot exceed 20 characters')
    .trim(),
});

export const updateLabelSchema = z.object({
  name: z
    .string()
    .min(1, 'Label name cannot be empty')
    .max(50, 'Label name cannot exceed 50 characters')
    .trim()
    .optional(),
  color: z
    .string()
    .min(1, 'Label color cannot be empty')
    .max(20, 'Label color cannot exceed 20 characters')
    .trim()
    .optional(),
});

export const labelIdParamSchema = z.object({
  id: z
    .string({ message: 'Label ID is required' })
    .regex(/^\d+$/, 'Label ID must be a numeric ID'),
});

export const getLabelsQuerySchema = z.object({
  projectId: z
    .string({ message: 'Project ID is required' })
    .regex(/^\d+$/, 'Project ID must be a numeric ID'),
  search: z.string().optional(),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type LabelIdParamInput = z.infer<typeof labelIdParamSchema>;
export type GetLabelsQueryInput = z.infer<typeof getLabelsQuerySchema>;
