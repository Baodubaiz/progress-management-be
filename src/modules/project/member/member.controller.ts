import { Request, Response, NextFunction } from 'express';
import { memberService } from './member.service';
import { sendResponse } from '../../../utils/api-response';

export class MemberController {
  /**
   * Get all members of a project
   * GET /api/v1/projects/:projectId/members
   */
  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await memberService.getMembers(
        req.user!.id,
        req.params.projectId as string
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Project members fetched successfully',
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add member to project
   * POST /api/v1/projects/:projectId/members
   */
  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const member = await memberService.addMember(
        req.user!.id,
        req.params.projectId as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 201,
        message: 'Member added to project successfully',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   * PATCH /api/v1/projects/:projectId/members/:userId
   */
  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await memberService.updateMemberRole(
        req.user!.id,
        req.params.projectId as string,
        req.params.userId as string,
        req.body
      );
      sendResponse({
        res,
        statusCode: 200,
        message: 'Member role updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member or Leave project
   * DELETE /api/v1/projects/:projectId/members/:userId
   */
  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await memberService.removeMember(
        req.user!.id,
        req.params.projectId as string,
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
}

export const memberController = new MemberController();

