import { Router } from 'express';
import {
  getDashboard,
  getAdminReports,
  getAdminBookings,
  updateBookingStatus,
  getSchedule,
  updateSchedule,
  addBlockedPeriod,
  removeBlockedPeriod,
  addHoliday,
  removeHoliday,
  getCustomers,
  getCustomerDetails,
  getAdminVehicles,
  getPayments,
  recordCODCollection,
} from '../controllers/adminController.js';
import { createService, updateService, deleteService } from '../controllers/serviceController.js';
import { getBookingById } from '../controllers/bookingController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { validate, serviceRules } from '../middleware/validate.js';

const router = Router();

// All routes mounted at /api/admin

// Dashboard
router.get('/dashboard', protect, requireAdmin, getDashboard);

// Reports
router.get('/reports', protect, requireAdmin, getAdminReports);

// Schedule
router.get('/schedule', protect, requireAdmin, getSchedule);
router.put('/schedule', protect, requireAdmin, updateSchedule);
router.post('/schedule/block', protect, requireAdmin, addBlockedPeriod);
router.delete('/schedule/block/:periodId', protect, requireAdmin, removeBlockedPeriod);
router.post('/schedule/holiday', protect, requireAdmin, addHoliday);
router.delete('/schedule/holiday/:holidayId', protect, requireAdmin, removeHoliday);

// Customers
router.get('/customers', protect, requireAdmin, getCustomers);
router.get('/customers/:id', protect, requireAdmin, getCustomerDetails);

// Vehicles
router.get('/vehicles', protect, requireAdmin, getAdminVehicles);

// Services
router.post('/services', protect, requireAdmin, validate(serviceRules), createService);
router.put('/services/:id', protect, requireAdmin, updateService);
router.delete('/services/:id', protect, requireAdmin, deleteService);

// Bookings — list must come before :id to avoid route shadowing
router.get('/bookings', protect, requireAdmin, getAdminBookings);
router.get('/bookings/:id', protect, requireAdmin, getBookingById);
router.patch('/bookings/:id/status', protect, requireAdmin, updateBookingStatus);

// Payments
router.get('/payments', protect, requireAdmin, getPayments);
router.patch('/payments/:id/collect', protect, requireAdmin, recordCODCollection);

// Dev-only: seed services
if (process.env.NODE_ENV === 'development') {
  router.post('/seed/services', protect, requireAdmin, async (req, res, next) => {
    try {
      const { seedServicesData } = await import('../../scripts/seedServices.js');
      const result = await seedServicesData();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });
}

export default router;
