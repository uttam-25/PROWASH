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

// PUT /api/notifications/read-all  — must be before /:id/read to avoid conflict
router.put('/read-all', protect, markAllRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, markRead);

export default router;
