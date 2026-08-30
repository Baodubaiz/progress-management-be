import { Router, Request, Response } from 'express';
import authRoutes from '../modules/auth/auth/auth.routes';
import refreshTokenRoutes from '../modules/auth/refresh-token/refresh-token.routes';
import userRoutes from '../modules/user/user/user.routes';
import projectRoutes from '../modules/project/project/project.routes';
import memberRoutes from '../modules/project/member/member.routes';
import boardRoutes from '../modules/board/board/board.routes';
import columnRoutes from '../modules/board/column/column.routes';
import taskRoutes from '../modules/task/task/task.routes';
import labelRoutes from '../modules/label/label/label.routes';
import commentRoutes from '../modules/comment/comment/comment.routes';
import activityRoutes from '../modules/activity/activity/activity.routes';

const router = Router();

// Test API Route
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Progress Management API v1',
  });
});

// Module Auth
router.use('/auth', authRoutes);
router.use('/auth', refreshTokenRoutes);

// Module User
router.use('/users', userRoutes);

// Module Project
router.use('/projects', projectRoutes);
router.use('/projects', memberRoutes);

// Module Board & Column
router.use('/boards', boardRoutes);
router.use('/columns', columnRoutes);

// Module Task
router.use('/tasks', taskRoutes);

// Module Label
router.use('/labels', labelRoutes);

// Module Comment
router.use('/comments', commentRoutes);

// Module Activity
router.use('/activities', activityRoutes);

export default router;
