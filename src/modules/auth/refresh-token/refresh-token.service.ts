import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
} from '../../../utils/jwt.util';

export class RefreshTokenService {
  /**
   * Rotate refresh token and issue a new pair of access & refresh tokens
   */
  async rotateRefreshToken(rawToken: string) {
    if (!rawToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const tokenHash = hashToken(rawToken);

    // Find token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check if token was revoked
    if (storedToken.revokedAt !== null) {
      // Possible token reuse attempt: Revoke all tokens for this user for security
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppError(
        'Refresh token has been revoked. All sessions invalidated for security.',
        401
      );
    }

    // Check expiration
    if (new Date() > storedToken.expiresAt) {
      throw new AppError('Refresh token has expired. Please login again.', 401);
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new token pair
    const tokenPayload = {
      id: storedToken.user.id.toString(),
      email: storedToken.user.email,
      username: storedToken.user.username,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = getRefreshTokenExpiryDate(7);

    // Save new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newTokenHash,
        expiresAt,
      },
    });

    return {
      user: storedToken.user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke a single refresh token
   */
  async revokeToken(rawToken: string) {
    if (!rawToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const tokenHash = hashToken(rawToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Token revoked successfully' };
  }

  /**
   * Revoke all active refresh tokens for a user (force logout on all devices)
   */
  async revokeAllUserTokens(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId: BigInt(userId), revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'All active sessions have been revoked successfully' };
  }
}

export const refreshTokenService = new RefreshTokenService();

