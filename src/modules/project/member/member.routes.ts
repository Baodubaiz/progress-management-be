import { Router } from 'express';
import { memberController } from './member.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import {
  addMemberSchema,
  updateMemberRoleSchema,
  projectIdParamSchema,
  projectMemberParamsSchema,
} from './member.validation';

const router = Router({ mergeParams: true });

// Protect all member routes
router.use(authenticate);

/**
 * @openapi
 * /projects/{projectId}/members:
 *   get:
 *     tags:
 *       - Project Members
 *     summary: Get all project members
 *     description: Retrieve all members of a project. Accessible by any project member.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project members list
 *       403:
 *         description: Access denied
 *       404:
 *         description: Project not found
 */
router.get(
  '/:projectId/members',
  validateRequest({ params: projectIdParamSchema }),
  memberController.getMembers
);

/**
 * @openapi
 * /projects/{projectId}/members:
 *   post:
 *     tags:
 *       - Project Members
 *     summary: Add a member to project
 *     description: Add an existing user to project by their registered email. Only accessible by project OWNER.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: bob@example.com
 *               role:
 *                 type: string
 *                 enum: [OWNER, MEMBER]
 *                 default: MEMBER
 *     responses:
 *       201:
 *         description: Member added successfully
 *       403:
 *         description: Forbidden (Only OWNER can add members)
 *       404:
 *         description: User or Project not found
 *       409:
 *         description: User already a member
 */
router.post(
  '/:projectId/members',
  validateRequest({
    params: projectIdParamSchema,
    body: addMemberSchema,
  }),
  memberController.addMember
);

/**
 * @openapi
 * /projects/{projectId}/members/{userId}:
 *   patch:
 *     tags:
 *       - Project Members
 *     summary: Update member role
 *     description: Change a member's role (OWNER or MEMBER). Only accessible by project OWNER.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [OWNER, MEMBER]
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       400:
 *         description: Cannot demote the last owner
 *       403:
 *         description: Forbidden (Only OWNER can change roles)
 *       404:
 *         description: Member or Project not found
 */
router.patch(
  '/:projectId/members/:userId',
  validateRequest({
    params: projectMemberParamsSchema,
    body: updateMemberRoleSchema,
  }),
  memberController.updateRole
);

/**
 * @openapi
 * /projects/{projectId}/members/{userId}:
 *   delete:
 *     tags:
 *       - Project Members
 *     summary: Remove member or leave project
 *     description: Remove a member from the project (if requester is OWNER) or leave the project (if requester is the user itself).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed or left project successfully
 *       400:
 *         description: The last owner cannot leave without transferring ownership
 *       403:
 *         description: Forbidden (Only OWNER can remove other members)
 *       404:
 *         description: Member or Project not found
 */
router.delete(
  '/:projectId/members/:userId',
  validateRequest({ params: projectMemberParamsSchema }),
  memberController.removeMember
);

export default router;

