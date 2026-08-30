import { z } from 'zod';

export const createUserSchema = z.object({
  username: z
    .string({ message: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username cannot exceed 100 characters')
    .trim(),
  email: z
    .string({ message: 'Email is required' })
    .email('Invalid email address')
    .max(255, 'Email cannot exceed 255 characters')
    .toLowerCase()
    .trim(),
  password: z
    .string({ message: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  avatarUrl: z
    .string()
    .max(500, 'Avatar URL cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username cannot exceed 100 characters')
    .trim()
    .optional(),
  avatarUrl: z
    .string()
    .max(500, 'Avatar URL cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ message: 'Current password is required' })
    .min(1, 'Current password cannot be empty'),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password cannot exceed 100 characters'),
});

export const userIdParamSchema = z.object({
  id: z
    .string({ message: 'User ID is required' })
    .regex(/^\d+$/, 'User ID must be a numeric ID'),
});

export const getUsersQuerySchema = z.object({
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

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserIdParamInput = z.infer<typeof userIdParamSchema>;
export type GetUsersQueryInput = z.infer<typeof getUsersQuerySchema>;

