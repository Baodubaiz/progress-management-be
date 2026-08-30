import { Request, Response, NextFunction } from 'express';
import { labelService } from './label.service';
import { sendResponse } from '../../../utils/api-response';

export class LabelController {
  /**
   * Create new label
   * POST /api/v1/labels
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const label = await labelService.createLabel(req.user!.id, req.body);
      sendResponse({
        res,
        statusCode: 201,
        message: 'Label created successfully',
        data: label,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all labels of a project
   * GET /api/v1/labels?projectId=1
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = await labelService.getLabelsByProject(
        req.user!.id,
        req.query as any
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Labels fetched successfully',
        data: labels,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get label details by ID
   * GET /api/v1/labels/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const label = await labelService.getLabelById(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Label fetched successfully',
        data: label,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update label
   * PATCH /api/v1/labels/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await labelService.updateLabel(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Label updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete label
   * DELETE /api/v1/labels/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await labelService.deleteLabel(
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

export const labelController = new LabelController();
