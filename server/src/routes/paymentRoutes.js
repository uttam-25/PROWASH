import { Router } from 'express';
import {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  getMyPayments,
  getPayment,
  confirmUPIPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Webhook — no auth, must be first (before /:id)
router.post('/webhook', handleWebhook);

// Customer routes
router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyPayment);
router.post('/confirm-upi', protect, confirmUPIPayment);
router.get('/my', protect, getMyPayments);
router.get('/:id', protect, getPayment);

// Note: Admin payment routes (list all, update status) are handled via
// adminRoutes.js at /api/admin/payments to avoid /:id wildcard shadowing.

export default router;
