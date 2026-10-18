import Schedule from '../models/Schedule.js';
import { getAvailableSlots } from '../services/availabilityService.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// GET /api/availability?date=YYYY-MM-DD  (protect)
// ---------------------------------------------------------------------------
export const getAvailability = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new AppError('A valid date query parameter is required (YYYY-MM-DD)', 400));
    }

    const slots = await getAvailableSlots(date);
    res.json({ success: true, data: { date, slots } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/schedule  (protect + requireAdmin)
// Upserts a Schedule doc for a given date, allowing admin to configure it.
// ---------------------------------------------------------------------------
export const setSchedule = async (req, res, next) => {
  try {
    const { date, maxBookings, isOpen, slots } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new AppError('A valid date is required (YYYY-MM-DD)', 400));
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    const update = {};
    if (maxBookings !== undefined) update.maxBookings = maxBookings;
    if (isOpen !== undefined) update.isOpen = isOpen;
    if (slots !== undefined) update.slots = slots;

    const schedule = await Schedule.findOneAndUpdate(
      { date: parsedDate },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};
