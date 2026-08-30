import { z } from 'zod';

export const addMemberSchema = z.object({
  email: z
    .string({ message: 'User email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  role: z.enum(['OWNER', 'MEMBER']).default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'MEMBER'], {
    message: 'Role must be either OWNER or MEMBER',
  }),
});

export const projectIdParamSchema = z.object({
  projectId: z
    .string({ message: 'Project ID is required' })
    .regex(/^\d+$/, 'Project ID must be a numeric ID'),
});

export const projectMemberParamsSchema = z.object({
  projectId: z
    .string({ message: 'Project ID is required' })
    .regex(/^\d+$/, 'Project ID must be a numeric ID'),
  userId: z
    .string({ message: 'User ID is required' })
    .regex(/^\d+$/, 'User ID must be a numeric ID'),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type ProjectIdParamInput = z.infer<typeof projectIdParamSchema>;
export type ProjectMemberParamsInput = z.infer<typeof projectMemberParamsSchema>;

