import { Router } from 'express';
import { taskController } from './task.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  addAssigneesSchema,
  addLabelsSchema,
  taskIdParamSchema,
  removeAssigneeParamsSchema,
  removeLabelParamsSchema,
  getTasksQuerySchema,
} from './task.validation';

const router = Router();

// Protect all task routes
router.use(authenticate);

/**
 * @openapi
 * /tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create a new task
 *     description: Create a task in a column, optionally assigning members and labels.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columnId
 *               - title
 *             properties:
 *               columnId:
 *                 type: string
 *                 example: "1"
 *               title:
 *                 type: string
 *                 example: Implement Auth API
 *               description:
 *                 type: string
 *                 example: Build register, login, refresh token endpoints.
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *                 default: MEDIUM
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-09-15T00:00:00.000Z"
 *               position:
 *                 type: number
 *                 example: 65535
 *               assigneeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1", "2"]
 *               labelIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1"]
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error or assignees/labels do not belong to project
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 */
router.post(
  '/',
  validateRequest({ body: createTaskSchema }),
  taskController.create
);

/**
 * @openapi
 * /tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get tasks list
 *     description: Retrieve tasks filtered by columnId, boardId, projectId, priority, or assignee.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: columnId
 *         schema:
 *           type: string
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Tasks fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  validateRequest({ query: getTasksQuerySchema }),
  taskController.getAll
);

/**
 * @openapi
 * /tasks/{id}:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get task details by ID
 *     description: Retrieve detailed task information including assignees, labels, and comments.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *     responses:
 *       200:
 *         description: Task details fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.get(
  '/:id',
  validateRequest({ params: taskIdParamSchema }),
  taskController.getById
);

/**
 * @openapi
 * /tasks/{id}:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Update task
 *     description: Update task details with optional optimistic concurrency version check.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Task Title
 *               description:
 *                 type: string
 *                 example: Updated description content
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               version:
 *                 type: integer
 *                 description: Optimistic lock version
 *                 example: 1
 *               assigneeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1", "2"]
 *               labelIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1"]
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       409:
 *         description: Conflict (Task has been modified by another user)
 */
router.patch(
  '/:id',
  validateRequest({
    params: taskIdParamSchema,
    body: updateTaskSchema,
  }),
  taskController.update
);

/**
 * @openapi
 * /tasks/{id}/move:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Move/Reorder task
 *     description: Move task to another column or reorder within the same column using fractional positions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               columnId:
 *                 type: string
 *                 description: Target column ID
 *                 example: "2"
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
 *         description: Task moved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task or column not found
 */
router.patch(
  '/:id/move',
  validateRequest({
    params: taskIdParamSchema,
    body: moveTaskSchema,
  }),
  taskController.move
);

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Delete task
 *     description: Delete a task. Accessible by project OWNER or the task creator.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.delete(
  '/:id',
  validateRequest({ params: taskIdParamSchema }),
  taskController.delete
);

// ==============================================
// TASK ASSIGNEE ROUTES
// ==============================================

/**
 * @openapi
 * /tasks/{id}/assignees:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get all assignees of a task
 *     description: Retrieve user profiles assigned to a specific task.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *     responses:
 *       200:
 *         description: Assignees fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Task not found
 */
router.get(
  '/:id/assignees',
  validateRequest({ params: taskIdParamSchema }),
  taskController.getAssignees
);

/**
 * @openapi
 * /tasks/{id}/assignees:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Add assignees to a task
 *     description: Assign one or more project members to a task.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1", "2"]
 *               userId:
 *                 type: string
 *                 example: "1"
 *     responses:
 *       201:
 *         description: Assignees added successfully
 *       400:
 *         description: Validation error or users are not project members
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       409:
 *         description: Users already assigned
 */
router.post(
  '/:id/assignees',
  validateRequest({
    params: taskIdParamSchema,
    body: addAssigneesSchema,
  }),
  taskController.addAssignees
);

/**
 * @openapi
 * /tasks/{id}/assignees/{userId}:
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Remove an assignee from a task
 *     description: Unassign a project member from a task.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric User ID
 *     responses:
 *       200:
 *         description: Assignee removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task or assignee not found
 */
router.delete(
  '/:id/assignees/:userId',
  validateRequest({ params: removeAssigneeParamsSchema }),
  taskController.removeAssignee
);

// ==============================================
// TASK LABEL ROUTES
// ==============================================

/**
 * @openapi
 * /tasks/{id}/labels:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get all labels of a task
 *     description: Retrieve all project labels applied to a specific task.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *     responses:
 *       200:
 *         description: Labels fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Task not found
 */
router.get(
  '/:id/labels',
  validateRequest({ params: taskIdParamSchema }),
  taskController.getLabels
);

/**
 * @openapi
 * /tasks/{id}/labels:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Add labels to a task
 *     description: Attach one or more project labels to a task.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               labelIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1", "2"]
 *               labelId:
 *                 type: string
 *                 example: "1"
 *     responses:
 *       201:
 *         description: Labels attached successfully
 *       400:
 *         description: Validation error or labels do not belong to project
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       409:
 *         description: Labels already attached
 */
router.post(
  '/:id/labels',
  validateRequest({
    params: taskIdParamSchema,
    body: addLabelsSchema,
  }),
  taskController.addLabels
);

/**
 * @openapi
 * /tasks/{id}/labels/{labelId}:
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Remove a label from a task
 *     description: Detach a label from a task.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Task ID
 *       - in: path
 *         name: labelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Label ID
 *     responses:
 *       200:
 *         description: Label removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task or label not found
 */
router.delete(
  '/:id/labels/:labelId',
  validateRequest({ params: removeLabelParamsSchema }),
  taskController.removeLabel
);

export default router;
