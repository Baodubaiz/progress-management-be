import { Request, Response, NextFunction } from 'express';
import { boardService } from './board.service';
import { sendResponse } from '../../../utils/api-response';

export class BoardController {
  /**
   * Create new board
   * POST /api/v1/boards
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const board = await boardService.createBoard(req.user!.id, req.body);
      sendResponse({
        res,
        statusCode: 201,
        message: 'Board created successfully',
        data: board,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all boards of a project
   * GET /api/v1/boards?projectId=1
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await boardService.getBoardsByProject(
        req.user!.id,
        req.query as any
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Boards fetched successfully',
        data: result,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get board details by ID
   * GET /api/v1/boards/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const board = await boardService.getBoardById(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Board fetched successfully',
        data: board,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update board
   * PATCH /api/v1/boards/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await boardService.updateBoard(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Board updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete board
   * DELETE /api/v1/boards/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await boardService.deleteBoard(
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

export const boardController = new BoardController();
