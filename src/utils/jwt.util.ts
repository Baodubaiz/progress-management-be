import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtUserPayload } from '../types/express';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'super_secret_access_jwt_key_progress_management_2026';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_progress_management_2026';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate Access Token (JWT)
 */
export const generateAccessToken = (payload: JwtUserPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN as any,
  });
};

/**
 * Generate Refresh Token (Opaque secure random string or JWT)
 */
export const generateRefreshToken = (payload: JwtUserPayload): string => {
  // Using secure JWT with user ID for verification
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN as any,
  });
};

/**
 * Hash a refresh token using SHA256 before storing in database
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, ACCESS_SECRET) as JwtUserPayload;
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, REFRESH_SECRET) as JwtUserPayload;
};

/**
 * Helper to calculate expiry Date for refresh token (default 7 days)
 */
export const getRefreshTokenExpiryDate = (days: number = 7): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

