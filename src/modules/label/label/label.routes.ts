import { Router } from 'express';
import { labelController } from './label.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import {
  createLabelSchema,
  updateLabelSchema,
  labelIdParamSchema,
  getLabelsQuerySchema,
} from './label.validation';

const router = Router();

// Protect all label routes
router.use(authenticate);

/**
 * @openapi
 * /labels:
 *   post:
 *     tags:
 *       - Labels
 *     summary: Create a new label
 *     description: Create a label in a project with a unique name and a color.
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
 *               - color
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: "1"
 *               name:
 *                 type: string
 *                 example: Bug
 *               color:
 *                 type: string
 *                 example: "#EF4444"
 *     responses:
 *       201:
 *         description: Label created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a project member)
 *       409:
 *         description: Label name already exists in this project
 */
router.post(
  '/',
  validateRequest({ body: createLabelSchema }),
  labelController.create
);

/**
 * @openapi
 * /labels:
 *   get:
 *     tags:
 *       - Labels
 *     summary: Get all labels of a project
 *     description: Retrieve all labels in a project with usage counts.
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Labels fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  validateRequest({ query: getLabelsQuerySchema }),
  labelController.getAll
);

/**
 * @openapi
 * /labels/{id}:
 *   get:
 *     tags:
 *       - Labels
 *     summary: Get label details by ID
 *     description: Retrieve details of a specific label.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Label ID
 *     responses:
 *       200:
 *         description: Label details fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Label not found
 */
router.get(
  '/:id',
  validateRequest({ params: labelIdParamSchema }),
  labelController.getById
);

/**
 * @openapi
 * /labels/{id}:
 *   patch:
 *     tags:
 *       - Labels
 *     summary: Update label
 *     description: Update label name or color code.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Label ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Critical Bug
 *               color:
 *                 type: string
 *                 example: "#DC2626"
 *     responses:
 *       200:
 *         description: Label updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Label not found
 *       409:
 *         description: Label name already exists in this project
 */
router.patch(
  '/:id',
  validateRequest({
    params: labelIdParamSchema,
    body: updateLabelSchema,
  }),
  labelController.update
);

/**
 * @openapi
 * /labels/{id}:
 *   delete:
 *     tags:
 *       - Labels
 *     summary: Delete label
 *     description: Permanently delete a label and remove it from all tasks.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric Label ID
 *     responses:
 *       200:
 *         description: Label deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Label not found
 */
router.delete(
  '/:id',
  validateRequest({ params: labelIdParamSchema }),
  labelController.delete
);

export default router;
