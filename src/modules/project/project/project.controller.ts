import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';
import { sendResponse } from '../../../utils/api-response';

export class ProjectController {
  /**
   * Create new project
   * POST /api/v1/projects
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.createProject(req.user!.id, req.body);
      sendResponse({
        res,
        statusCode: 201,
        message: 'Project created successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all user projects
   * GET /api/v1/projects
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectService.getProjects(
        req.user!.id,
        req.query as any
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Projects fetched successfully',
        data: result.projects,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project by ID
   * GET /api/v1/projects/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getProjectById(
        req.user!.id,
        req.params.id as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Project fetched successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update project
   * PATCH /api/v1/projects/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await projectService.updateProject(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Project updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete project
   * DELETE /api/v1/projects/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectService.deleteProject(
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

export const projectController = new ProjectController();

