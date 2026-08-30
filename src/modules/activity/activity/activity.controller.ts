import { Request, Response, NextFunction } from 'express';
import { activityService } from './activity.service';
import { sendResponse } from '../../../utils/api-response';

export class ActivityController {
  /**
   * Get activity log for a project (with optional filters)
   * GET /api/v1/activities?projectId=1
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await activityService.getActivities(
        req.user!.id,
        req.query as any
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Activities fetched successfully',
        data: result.activities,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single activity by ID
   * GET /api/v1/activities/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activity = await activityService.getActivityById(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Activity fetched successfully',
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const activityController = new ActivityController();
