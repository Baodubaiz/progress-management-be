import { Router } from 'express';
import { refreshTokenController } from './refresh-token.controller';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { authenticate } from '../../../middlewares/auth.middleware';
import { refreshTokenSchema, revokeTokenSchema } from './refresh-token.validation';

const router = Router();

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Exchange a valid refresh token (from body or HttpOnly cookie) for a new pair of access & refresh tokens (Token Rotation).
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional if passed via HttpOnly cookie
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  '/refresh-token',
  validateRequest({ body: refreshTokenSchema }),
  refreshTokenController.refresh
);

/**
 * @openapi
 * /auth/revoke-token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Revoke a single refresh token
 *     description: Invalidate a specific refresh token.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token revoked successfully
 */
router.post(
  '/revoke-token',
  validateRequest({ body: revokeTokenSchema }),
  refreshTokenController.revoke
);

/**
 * @openapi
 * /auth/revoke-all:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Revoke all refresh tokens for user
 *     description: Invalidate all active sessions/tokens across all devices for the current logged-in user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All active sessions revoked
 *       401:
 *         description: Unauthorized
 */
router.post('/revoke-all', authenticate, refreshTokenController.revokeAll);

export default router;

