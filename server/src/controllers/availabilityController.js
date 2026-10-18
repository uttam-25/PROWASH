import Service from '../models/Service.js';
import Schedule from '../models/Schedule.js';
import { getAvailableSlots } from '../services/availabilityService.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// GET /api/availability?serviceId=xxx&date=YYYY-MM-DD  (protect)
// ---------------------------------------------------------------------------
export const getAvailability = async (req, res, next) => {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId) {
      return next(new AppError('serviceId query parameter is required', 400));
    }
    if (!date) {
      return next(new AppError('date query parameter is required (YYYY-MM-DD)', 400));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new AppError('date must be in YYYY-MM-DD format', 400));
    }

    // Validate date is today or future in IST
    const istTodayString = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
    if (date < istTodayString) {
      return next(new AppError('date must be today or a future date', 400));
    }

    // Load service (also validates serviceId)
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return next(new AppError('Service not found or inactive', 404));
    }

    const availableSlots = await getAvailableSlots(serviceId, date);

    res.json({
      success: true,
      data: {
        date,
        serviceDurationMinutes: service.duration,
        availableSlots,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/schedule  (protect + requireAdmin)
// Upserts the single active Schedule config document.
// ---------------------------------------------------------------------------
export const setSchedule = async (req, res, next) => {
  try {
    const {
      workingDays,
      openingTime,
      closingTime,
      slotIntervalMinutes,
      maxConcurrentBookings,
      breaks,
      blockedPeriods,
      holidays,
    } = req.body;

    const update = {};
    if (workingDays !== undefined) update.workingDays = workingDays;
    if (openingTime !== undefined) update.openingTime = openingTime;
    if (closingTime !== undefined) update.closingTime = closingTime;
    if (slotIntervalMinutes !== undefined) update.slotIntervalMinutes = slotIntervalMinutes;
    if (maxConcurrentBookings !== undefined) update.maxConcurrentBookings = maxConcurrentBookings;
    if (breaks !== undefined) update.breaks = breaks;
    if (blockedPeriods !== undefined) update.blockedPeriods = blockedPeriods;
    if (holidays !== undefined) update.holidays = holidays;

    const schedule = await Schedule.findOneAndUpdate(
      { isActive: true },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};
