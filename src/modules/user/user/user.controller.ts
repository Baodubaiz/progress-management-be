import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { sendResponse } from '../../../utils/api-response';

export class UserController {
  /**
   * Get current authenticated user profile
   * GET /api/v1/users/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.user!.id);
      sendResponse({
        res,
        statusCode: 200,
        message: 'Profile fetched successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user
   * POST /api/v1/users
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // If an avatar image was uploaded via multipart/form-data
      if (req.file) {
        req.body.avatarUrl = `/uploads/avatars/${req.file.filename}`;
      }

      const user = await userService.createUser(req.body);
      sendResponse({
        res,
        statusCode: 201,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users with pagination and search
   * GET /api/v1/users
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.getUsers(req.query as any);
      sendResponse({
        res,
        statusCode: 200,
        message: 'Users fetched successfully',
        data: result.users,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id as string);
      sendResponse({
        res,
        statusCode: 200,
        message: 'User fetched successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user details
   * PATCH /api/v1/users/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // If an avatar image was uploaded via multipart/form-data
      if (req.file) {
        req.body.avatarUrl = `/uploads/avatars/${req.file.filename}`;
      }

      const user = await userService.updateUser(req.params.id as string, req.body);
      sendResponse({
        res,
        statusCode: 200,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change user password
   * PATCH /api/v1/users/:id/change-password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.changePassword(
        req.params.id as string,
        req.body
      );
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
   * Delete user
   * DELETE /api/v1/users/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.deleteUser(req.params.id as string);
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

export const userController = new UserController();
