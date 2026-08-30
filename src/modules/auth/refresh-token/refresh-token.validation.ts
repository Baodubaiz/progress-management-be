import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ message: 'Refresh token is required' })
    .min(1, 'Refresh token cannot be empty')
    .optional(),
});

export const revokeTokenSchema = z.object({
  refreshToken: z
    .string({ message: 'Refresh token is required' })
    .min(1, 'Refresh token cannot be empty')
    .optional(),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type RevokeTokenInput = z.infer<typeof revokeTokenSchema>;

