import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z
    .string({ message: 'Project name is required' })
    .min(1, 'Project name cannot be empty')
    .max(150, 'Project name cannot exceed 150 characters')
    .trim(),
  description: z
    .string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional()
    .nullable(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name cannot be empty')
    .max(150, 'Project name cannot exceed 150 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional()
    .nullable(),
});

export const projectIdParamSchema = z.object({
  id: z
    .string({ message: 'Project ID is required' })
    .regex(/^\d+$/, 'Project ID must be a numeric ID'),
});

export const getProjectsQuerySchema = z.object({
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

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectIdParamInput = z.infer<typeof projectIdParamSchema>;
export type GetProjectsQueryInput = z.infer<typeof getProjectsQuerySchema>;

