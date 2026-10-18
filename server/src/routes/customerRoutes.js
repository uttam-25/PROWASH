import { Router } from 'express';
import {
  getAllCustomers,
  getCustomer,
  toggleCustomerActive,
} from '../controllers/customerController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All customer management routes are admin-only
// Mounted at /api/admin/customers
router.get('/', protect, requireAdmin, getAllCustomers);
router.get('/:id', protect, requireAdmin, getCustomer);
router.put('/:id/toggle', protect, requireAdmin, toggleCustomerActive);

export default router;
