import { Router } from 'express';
import {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
} from '../controllers/serviceController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { validate, serviceRules } from '../middleware/validate.js';

const router = Router();

// Public routes
router.get('/', getServices);
router.get('/:id', getService);

// Admin routes
router.post('/admin/services', protect, requireAdmin, validate(serviceRules), createService);
router.put('/admin/services/:id', protect, requireAdmin, updateService);
router.delete('/admin/services/:id', protect, requireAdmin, deleteService);

export default router;
