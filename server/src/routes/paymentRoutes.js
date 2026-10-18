import { Router } from 'express';
import {
  getMyPayments,
  getPayment,
  getAllPayments,
  updatePaymentStatus,
} from '../controllers/paymentController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Customer routes
router.get('/my', protect, getMyPayments);
router.get('/:id', protect, getPayment);

// Admin routes
router.get('/admin/payments', protect, requireAdmin, getAllPayments);
router.put('/admin/payments/:id/status', protect, requireAdmin, updatePaymentStatus);

export default router;
