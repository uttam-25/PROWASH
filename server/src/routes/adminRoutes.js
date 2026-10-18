import { Router } from 'express';
import {
  getAdminBookings,
  updateBookingStatus,
  getDashboard,
  getAdminReports,
} from '../controllers/adminController.js';
import { setSchedule } from '../controllers/availabilityController.js';
import { getAllVehicles } from '../controllers/vehicleController.js';
import { createService, updateService, deleteService } from '../controllers/serviceController.js';
import { getBookingById } from '../controllers/bookingController.js';
import { getAllPayments, updatePaymentStatus } from '../controllers/paymentController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { validate, serviceRules } from '../middleware/validate.js';

const router = Router();

// All routes mounted at /api/admin

// Dashboard
router.get('/dashboard', protect, requireAdmin, getDashboard);

// Reports
router.get('/reports', protect, requireAdmin, getAdminReports);

// Schedule
router.post('/schedule', protect, requireAdmin, setSchedule);

// Vehicles
router.get('/vehicles', protect, requireAdmin, getAllVehicles);

// Services
router.post('/services', protect, requireAdmin, validate(serviceRules), createService);
router.put('/services/:id', protect, requireAdmin, updateService);
router.delete('/services/:id', protect, requireAdmin, deleteService);

// Bookings — list must come before :id to avoid route shadowing
router.get('/bookings', protect, requireAdmin, getAdminBookings);
router.get('/bookings/:id', protect, requireAdmin, getBookingById);
router.patch('/bookings/:id/status', protect, requireAdmin, updateBookingStatus);

// Payments
router.get('/payments', protect, requireAdmin, getAllPayments);
router.put('/payments/:id/status', protect, requireAdmin, updatePaymentStatus);

export default router;
