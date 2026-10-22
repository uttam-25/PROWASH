import { Router } from 'express';
import {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  getMyPayments,
  getPayment,
  getAllPayments,
  updatePaymentStatus,
  confirmUPIPayment,
} from '../controllers/paymentController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Webhook — no auth, must be first (before /:id)
router.post('/webhook', handleWebhook);

// Customer routes
router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyPayment);
router.post('/confirm-upi', protect, confirmUPIPayment);
router.get('/my', protect, getMyPayments);
router.get('/:id', protect, getPayment);

// Admin routes
router.get('/admin/payments', protect, requireAdmin, getAllPayments);
router.put('/admin/payments/:id/status', protect, requireAdmin, updatePaymentStatus);

export default router;
