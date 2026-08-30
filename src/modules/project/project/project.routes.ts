import { Router } from 'express';
import { projectController } from './project.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  getProjectsQuerySchema,
} from './project.validation';

const router = Router();

// Protect all project routes
router.use(authenticate);

/**
 * @openapi
 * /projects:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Create a new project
 *     description: Create a project and automatically set current user as OWNER.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mobile Banking App
 *               description:
 *                 type: string
 *                 example: Project for building cross-platform banking app.
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  validateRequest({ body: createProjectSchema }),
  projectController.create
);

/**
 * @openapi
 * /projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get all projects of the user
 *     description: Retrieve all projects where the authenticated user is a member or owner.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projects fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  validateRequest({ query: getProjectsQuerySchema }),
  projectController.getAll
);

/**
 * @openapi
 * /projects/{id}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get project details
 *     description: Retrieve detailed project info including members, boards, and labels.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details fetched successfully
 *       403:
 *         description: Access denied (Not a project member)
 *       404:
 *         description: Project not found
 */
router.get(
  '/:id',
  validateRequest({ params: projectIdParamSchema }),
  projectController.getById
);

/**
 * @openapi
 * /projects/{id}:
 *   patch:
 *     tags:
 *       - Projects
 *     summary: Update project
 *     description: Update project name and description. Only accessible by project OWNER.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Project Name
 *               description:
 *                 type: string
 *                 example: Updated description
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       403:
 *         description: Forbidden (Only OWNER can update)
 *       404:
 *         description: Project not found
 */
router.patch(
  '/:id',
  validateRequest({
    params: projectIdParamSchema,
    body: updateProjectSchema,
  }),
  projectController.update
);

/**
 * @openapi
 * /projects/{id}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Delete project
 *     description: Permanently delete project and all associated boards, columns, and tasks. Only accessible by project OWNER.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       403:
 *         description: Forbidden (Only OWNER can delete)
 *       404:
 *         description: Project not found
 */
router.delete(
  '/:id',
  validateRequest({ params: projectIdParamSchema }),
  projectController.delete
);

export default router;

