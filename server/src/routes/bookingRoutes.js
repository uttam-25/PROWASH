import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
} from '../controllers/bookingController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { validate, bookingRules } from '../middleware/validate.js';

const router = Router();

// Customer routes
router.post('/', protect, validate(bookingRules), createBooking);
router.get('/my', protect, getMyBookings);
router.get('/:id', protect, getBooking);
router.put('/:id/cancel', protect, cancelBooking);

// Admin routes
router.get('/admin/bookings', protect, requireAdmin, getAllBookings);
router.put('/admin/bookings/:id/status', protect, requireAdmin, updateBookingStatus);

export default router;
