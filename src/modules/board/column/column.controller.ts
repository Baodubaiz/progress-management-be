import { Request, Response, NextFunction } from 'express';
import { columnService } from './column.service';
import { sendResponse } from '../../../utils/api-response';

export class ColumnController {
  /**
   * Create new column
   * POST /api/v1/columns
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = (req.body.boardId || req.params.boardId) as string;
      const column = await columnService.createColumn(req.user!.id, {
        ...req.body,
        boardId,
      });
      sendResponse({
        res,
        statusCode: 201,
        message: 'Column created successfully',
        data: column,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all columns of a board
   * GET /api/v1/boards/:boardId/columns or GET /api/v1/columns?boardId=1
   */
  async getByBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = (req.params.boardId || req.query.boardId) as string;
      const columns = await columnService.getColumnsByBoard(
        req.user!.id,
        boardId
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Columns fetched successfully',
        data: columns,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get column details by ID
   * GET /api/v1/columns/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const column = await columnService.getColumnById(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Column fetched successfully',
        data: column,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update column (name, position)
   * PATCH /api/v1/columns/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await columnService.updateColumn(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Column updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Move/Reorder column position
   * PATCH /api/v1/columns/:id/move
   */
  async move(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await columnService.moveColumn(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Column moved successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete column
   * DELETE /api/v1/columns/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await columnService.deleteColumn(
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

export const columnController = new ColumnController();
