import { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service';
import { sendResponse } from '../../../utils/api-response';

export class CommentController {
  /**
   * Create new comment on a task
   * POST /api/v1/comments
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await commentService.createComment(req.user!.id, req.body);
      sendResponse({
        res,
        statusCode: 201,
        message: 'Comment created successfully',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all comments for a task
   * GET /api/v1/comments?taskId=1
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await commentService.getCommentsByTask(
        req.user!.id,
        req.query as any
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Comments fetched successfully',
        data: result.comments,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comment by ID
   * GET /api/v1/comments/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await commentService.getCommentById(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Comment fetched successfully',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update comment (author only)
   * PATCH /api/v1/comments/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await commentService.updateComment(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Comment updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete comment (author or project OWNER)
   * DELETE /api/v1/comments/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await commentService.deleteComment(
        req.user!.id,
        req.params.id as string
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
}

export const commentController = new CommentController();
