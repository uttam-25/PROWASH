import { Router } from 'express';
import { getAvailability, setSchedule } from '../controllers/availabilityController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/availability?date=YYYY-MM-DD  (protect)
router.get('/', protect, getAvailability);

// POST /api/admin/schedule  (protect + requireAdmin)
// Note: This route is also registered in adminRoutes.js for the /api/admin mount
router.post('/admin/schedule', protect, requireAdmin, setSchedule);

export default router;
