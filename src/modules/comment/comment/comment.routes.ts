import { Router } from 'express';
import { commentController } from './comment.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import {
  createCommentSchema,
  updateCommentSchema,
  commentIdParamSchema,
  getCommentsQuerySchema,
} from './comment.validation';

const router = Router();

// Protect all comment routes
router.use(authenticate);

/**
 * @openapi
 * /comments:
 *   post:
 *     tags:
 *       - Comments
 *     summary: Create a comment on a task
 *     description: Add a comment to a task within a project you have access to.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - content
 *             properties:
 *               taskId:
 *                 type: string
 *                 example: "1"
 *               content:
 *                 type: string
 *                 example: I have finished implementing the endpoints. Waiting for QA.
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Task not found
 */
router.post(
  '/',
  validateRequest({ body: createCommentSchema }),
  commentController.create
);

/**
 * @openapi
 * /comments:
 *   get:
 *     tags:
 *       - Comments
 *     summary: Get all comments for a task
 *     description: Retrieve comments for a task sorted in chronological order.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Comments fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.get(
  '/',
  validateRequest({ query: getCommentsQuerySchema }),
  commentController.getAll
);

/**
 * @openapi
 * /comments/{id}:
 *   get:
 *     tags:
 *       - Comments
 *     summary: Get comment by ID
 *     description: Retrieve a single comment by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Comment ID
 *     responses:
 *       200:
 *         description: Comment fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
router.get(
  '/:id',
  validateRequest({ params: commentIdParamSchema }),
  commentController.getById
);

/**
 * @openapi
 * /comments/{id}:
 *   patch:
 *     tags:
 *       - Comments
 *     summary: Update comment
 *     description: Update content of a comment. Only the author can update their comment.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Updated comment content.
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only author can edit)
 *       404:
 *         description: Comment not found
 */
router.patch(
  '/:id',
  validateRequest({
    params: commentIdParamSchema,
    body: updateCommentSchema,
  }),
  commentController.update
);

/**
 * @openapi
 * /comments/{id}:
 *   delete:
 *     tags:
 *       - Comments
 *     summary: Delete comment
 *     description: Delete a comment. Only the author or the project OWNER can delete.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
router.delete(
  '/:id',
  validateRequest({ params: commentIdParamSchema }),
  commentController.delete
);

export default router;
