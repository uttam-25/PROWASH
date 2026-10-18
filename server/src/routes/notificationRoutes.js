import { Router } from 'express';
import {
  getMyNotifications,
  markRead,
  markAllRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', protect, getMyNotifications);

// PATCH /api/notifications/read-all  — must be before /:id/read to avoid conflict
router.patch('/read-all', protect, markAllRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', protect, markRead);

export default router;
