import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';
import { sendResponse } from '../../../utils/api-response';

export class TaskController {
  /**
   * Create new task
   * POST /api/v1/tasks
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.createTask(req.user!.id, req.body);
      sendResponse({
        res,
        statusCode: 201,
        message: 'Task created successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tasks (filtered by column, board, or project)
   * GET /api/v1/tasks
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.getTasks(
        req.user!.id,
        req.query as any
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Tasks fetched successfully',
        data: result.tasks,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get task details by ID
   * GET /api/v1/tasks/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.getTaskById(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Task fetched successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update task
   * PATCH /api/v1/tasks/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await taskService.updateTask(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Task updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Move task (drag & drop between columns or change position)
   * PATCH /api/v1/tasks/:id/move
   */
  async move(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const moved = await taskService.moveTask(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Task moved successfully',
        data: moved,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete task
   * DELETE /api/v1/tasks/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.deleteTask(
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

  // ==============================================
  // ASSIGNEE CONTROLLERS
  // ==============================================

  /**
   * Get all assignees of a task
   * GET /api/v1/tasks/:id/assignees
   */
  async getAssignees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignees = await taskService.getAssignees(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Task assignees fetched successfully',
        data: assignees,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add assignees to a task
   * POST /api/v1/tasks/:id/assignees
   */
  async addAssignees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignees = await taskService.addAssignees(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 201,
        message: 'Assignees added successfully',
        data: assignees,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove an assignee from a task
   * DELETE /api/v1/tasks/:id/assignees/:userId
   */
  async removeAssignee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.removeAssignee(
        req.user!.id,
        req.params.id as string,
        req.params.userId as string
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

  // ==============================================
  // LABEL CONTROLLERS
  // ==============================================

  /**
   * Get all labels of a task
   * GET /api/v1/tasks/:id/labels
   */
  async getLabels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = await taskService.getTaskLabels(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Task labels fetched successfully',
        data: labels,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add labels to a task
   * POST /api/v1/tasks/:id/labels
   */
  async addLabels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = await taskService.addTaskLabels(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 201,
        message: 'Labels added successfully',
        data: labels,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a label from a task
   * DELETE /api/v1/tasks/:id/labels/:labelId
   */
  async removeLabel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.removeTaskLabel(
        req.user!.id,
        req.params.id as string,
        req.params.labelId as string
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

export const taskController = new TaskController();
