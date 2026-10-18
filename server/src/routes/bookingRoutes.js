import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';
import { validate, bookingRules, rescheduleRules } from '../middleware/validate.js';

const router = Router();

// Customer routes
router.post('/', protect, validate(bookingRules), createBooking);
router.get('/my', protect, getMyBookings);
router.get('/:id', protect, getBookingById);
router.patch('/:id/cancel', protect, cancelBooking);
router.patch('/:id/reschedule', protect, validate(rescheduleRules), rescheduleBooking);

export default router;
