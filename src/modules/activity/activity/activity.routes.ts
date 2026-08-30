import { Router } from 'express';
import { activityController } from './activity.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import {
  activityIdParamSchema,
  getActivitiesQuerySchema,
} from './activity.validation';

const router = Router();

// Protect all activity routes
router.use(authenticate);

/**
 * @openapi
 * /activities:
 *   get:
 *     tags:
 *       - Activities
 *     summary: Get project activity log
 *     description: |
 *       Retrieve the activity log for a project. All project members can view the log.
 *       Supports filtering by task, user, action type, and date range.
 *       Results are paginated and sorted newest first.
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
 *         name: taskId
 *         schema:
 *           type: string
 *         description: Filter by Task ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by User ID (actor)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum:
 *             - TASK_CREATED
 *             - TASK_UPDATED
 *             - TASK_MOVED
 *             - TASK_ASSIGNED
 *             - TASK_UNASSIGNED
 *             - COMMENT_ADDED
 *             - MEMBER_ADDED
 *             - MEMBER_REMOVED
 *         description: Filter by action type
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter activities from this date (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter activities up to this date (ISO 8601)
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Activities fetched successfully
 *       400:
 *         description: Validation error (e.g. missing projectId)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 */
router.get(
  '/',
  validateRequest({ query: getActivitiesQuerySchema }),
  activityController.getAll
);

/**
 * @openapi
 * /activities/{id}:
 *   get:
 *     tags:
 *       - Activities
 *     summary: Get a single activity entry
 *     description: Retrieve a single activity record by ID. Requester must be a member of the project the activity belongs to.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Activity ID
 *     responses:
 *       200:
 *         description: Activity fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       404:
 *         description: Activity not found
 */
router.get(
  '/:id',
  validateRequest({ params: activityIdParamSchema }),
  activityController.getById
);

export default router;
