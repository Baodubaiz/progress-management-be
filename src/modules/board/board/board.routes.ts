import { Router } from 'express';
import { boardController } from './board.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import {
  createBoardSchema,
  updateBoardSchema,
  boardIdParamSchema,
  getBoardsQuerySchema,
} from './board.validation';

const router = Router();

// Protect all board routes with authentication
router.use(authenticate);

/**
 * @openapi
 * /boards:
 *   post:
 *     tags:
 *       - Boards
 *     summary: Create a new board
 *     description: Create a board in a project and optionally initialize default columns.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - name
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: "1"
 *               name:
 *                 type: string
 *                 example: Sprint 1 Board
 *               description:
 *                 type: string
 *                 example: Kanban board for sprint 1 tasks.
 *               initialColumns:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["To Do", "In Progress", "Done"]
 *     responses:
 *       201:
 *         description: Board created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 */
router.post(
  '/',
  validateRequest({ body: createBoardSchema }),
  boardController.create
);

/**
 * @openapi
 * /boards:
 *   get:
 *     tags:
 *       - Boards
 *     summary: Get all boards of a project
 *     description: Retrieve all boards within a project that the user has access to.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Project ID
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
 *         description: Boards fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 */
router.get(
  '/',
  validateRequest({ query: getBoardsQuerySchema }),
  boardController.getAll
);

/**
 * @openapi
 * /boards/{id}:
 *   get:
 *     tags:
 *       - Boards
 *     summary: Get board details
 *     description: Retrieve detailed board info including columns, tasks, assignees, and labels.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Board ID
 *     responses:
 *       200:
 *         description: Board details fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Board not found
 */
router.get(
  '/:id',
  validateRequest({ params: boardIdParamSchema }),
  boardController.getById
);

/**
 * @openapi
 * /boards/{id}:
 *   patch:
 *     tags:
 *       - Boards
 *     summary: Update board
 *     description: Update board name and description. Accessible by any project member.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Board ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Board Name
 *               description:
 *                 type: string
 *                 example: Updated description
 *     responses:
 *       200:
 *         description: Board updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Board not found
 */
router.patch(
  '/:id',
  validateRequest({
    params: boardIdParamSchema,
    body: updateBoardSchema,
  }),
  boardController.update
);

/**
 * @openapi
 * /boards/{id}:
 *   delete:
 *     tags:
 *       - Boards
 *     summary: Delete board
 *     description: Permanently delete board and its columns/tasks. Accessible by project OWNER or board creator.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Board ID
 *     responses:
 *       200:
 *         description: Board deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Board not found
 */
router.delete(
  '/:id',
  validateRequest({ params: boardIdParamSchema }),
  boardController.delete
);

export default router;
