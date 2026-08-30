import { Router } from 'express';
import { columnController } from './column.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import {
  createColumnSchema,
  updateColumnSchema,
  moveColumnSchema,
  columnIdParamSchema,
  getColumnsQuerySchema,
} from './column.validation';

const router = Router();

// Protect all column routes
router.use(authenticate);

/**
 * @openapi
 * /columns:
 *   post:
 *     tags:
 *       - Columns
 *     summary: Create a new column
 *     description: Create a column in a specific board. Position will be auto-calculated if omitted.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - boardId
 *               - name
 *             properties:
 *               boardId:
 *                 type: string
 *                 example: "1"
 *               name:
 *                 type: string
 *                 example: In Review
 *               position:
 *                 type: number
 *                 example: 65535
 *     responses:
 *       201:
 *         description: Column created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Board not found
 */
router.post(
  '/',
  validateRequest({ body: createColumnSchema }),
  columnController.create
);

/**
 * @openapi
 * /columns:
 *   get:
 *     tags:
 *       - Columns
 *     summary: Get columns by board ID
 *     description: Retrieve all columns belonging to a board, sorted by position.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Board ID
 *     responses:
 *       200:
 *         description: Columns fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Board not found
 */
router.get(
  '/',
  validateRequest({ query: getColumnsQuerySchema }),
  columnController.getByBoard
);

/**
 * @openapi
 * /columns/{id}:
 *   get:
 *     tags:
 *       - Columns
 *     summary: Get column details by ID
 *     description: Retrieve column details including nested tasks.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Column ID
 *     responses:
 *       200:
 *         description: Column details fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Column not found
 */
router.get(
  '/:id',
  validateRequest({ params: columnIdParamSchema }),
  columnController.getById
);

/**
 * @openapi
 * /columns/{id}:
 *   patch:
 *     tags:
 *       - Columns
 *     summary: Update column
 *     description: Update column name or position.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Column ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Testing
 *               position:
 *                 type: number
 *                 example: 131070
 *     responses:
 *       200:
 *         description: Column updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Column not found
 */
router.patch(
  '/:id',
  validateRequest({
    params: columnIdParamSchema,
    body: updateColumnSchema,
  }),
  columnController.update
);

/**
 * @openapi
 * /columns/{id}/move:
 *   patch:
 *     tags:
 *       - Columns
 *     summary: Move/Reorder column
 *     description: Reorder column by specifying prevPosition and nextPosition, or targetPosition.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Column ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prevPosition:
 *                 type: number
 *                 nullable: true
 *                 example: 65535
 *               nextPosition:
 *                 type: number
 *                 nullable: true
 *                 example: 131070
 *               targetPosition:
 *                 type: number
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Column moved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Column not found
 */
router.patch(
  '/:id/move',
  validateRequest({
    params: columnIdParamSchema,
    body: moveColumnSchema,
  }),
  columnController.move
);

/**
 * @openapi
 * /columns/{id}:
 *   delete:
 *     tags:
 *       - Columns
 *     summary: Delete column
 *     description: Delete column and its tasks.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Column ID
 *     responses:
 *       200:
 *         description: Column deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Column not found
 */
router.delete(
  '/:id',
  validateRequest({ params: columnIdParamSchema }),
  columnController.delete
);

export default router;
