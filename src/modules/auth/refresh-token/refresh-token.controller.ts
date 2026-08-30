import { Request, Response, NextFunction } from 'express';
import { refreshTokenService } from './refresh-token.service';
import { sendResponse } from '../../../utils/api-response';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class RefreshTokenController {
  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-token
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.body?.refreshToken || req.cookies?.refreshToken;
      const result = await refreshTokenService.rotateRefreshToken(rawToken);

      // Update refresh token cookie
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      sendResponse({
        res,
        statusCode: 200,
        message: 'Tokens refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke single token
   * POST /api/v1/auth/revoke-token
   */
  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.body?.refreshToken || req.cookies?.refreshToken;
      const result = await refreshTokenService.revokeToken(rawToken);

      // Clear cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      sendResponse({
        res,
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke all user tokens (logout from all devices)
   * POST /api/v1/auth/revoke-all
   */
  async revokeAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await refreshTokenService.revokeAllUserTokens(req.user!.id);

      // Clear cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      sendResponse({
        res,
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const refreshTokenController = new RefreshTokenController();

