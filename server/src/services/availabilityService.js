import Schedule from '../models/Schedule.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import { AppError } from '../middleware/errorHandler.js';

// IST offset in ms: UTC+5:30 = 5.5 * 3600000 = 19800000
const IST_OFFSET_MS = 19800000;

/**
 * Parse 'HH:MM' → minutes from midnight (number)
 */
function timeToMinutes(hhmm) {
  const [hh, mm] = hhmm.split(':');
  return Number(hh) * 60 + Number(mm);
}

/**
 * Given dateString 'YYYY-MM-DD' and 'HH:MM' (in IST),
 * return a Date representing that IST time as UTC.
 *
 * IST HH:MM on date = UTC HH:MM on date - 5h30m
 * = new Date(Date.UTC(year, month-1, day, hh, mm) - IST_OFFSET_MS)
 */
function istHHMMtoUTC(dateString, hhmm) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hh, mm, 0) - IST_OFFSET_MS);
}

/**
 * Get IST day-of-week name for a dateString 'YYYY-MM-DD'.
 * Returns e.g. 'Monday', 'Tuesday', etc.
 * Uses a static lookup — no ICU/timezone data required.
 */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function getISTDayName(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  // UTC noon of that date shifted by IST offset — safe cross-midnight
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 6, 30, 0)); // UTC 06:30 = IST 12:00
  const istDate = new Date(utcNoon.getTime() + IST_OFFSET_MS);
  return DAY_NAMES[istDate.getUTCDay()];
}

/**
 * Get available slots for a given service on a given date.
 *
 * @param {string} serviceId - MongoDB ObjectId string
 * @param {string} dateString - 'YYYY-MM-DD'
 * @returns {Promise<Array<{ startAt: string, endAt: string }>>}
 */
export async function getAvailableSlots(serviceId, dateString) {
  // 1. Load active schedule; create default if none exists
  let schedule = await Schedule.findOne({ isActive: true }).lean();
  if (!schedule) {
    schedule = await new Schedule({ isActive: true }).save();
    schedule = schedule.toObject();
  }

  // 2. Load service
  const service = await Service.findById(serviceId).lean();
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const durationMinutes = service.duration; // Service model uses 'duration'

  // 3. Get IST day-of-week name
  const dayName = getISTDayName(dateString);

  // 4. Check if it's a working day
  if (!schedule.workingDays.includes(dayName)) {
    return [];
  }

  // 5. Check holidays
  if (schedule.holidays.some((h) => h.date === dateString)) {
    return [];
  }

  // 6. Opening / closing in minutes
  const openingMinutes = timeToMinutes(schedule.openingTime);
  const closingMinutes = timeToMinutes(schedule.closingTime);

  // 7. Build IST midnight UTC for this date (to compute slot times)
  // We use istHHMMtoUTC for each slot time directly — no need for explicit midnight

  // 8. Generate candidate slots
  const candidates = [];
  const interval = schedule.slotIntervalMinutes;

  for (let offset = 0; ; offset += interval) {
    const slotStartMinutes = openingMinutes + offset;
    const slotEndMinutes = slotStartMinutes + durationMinutes;

    if (slotEndMinutes > closingMinutes) break;

    // Convert to time strings so we can use istHHMMtoUTC
    const startHH = String(Math.floor(slotStartMinutes / 60)).padStart(2, '0');
    const startMM = String(slotStartMinutes % 60).padStart(2, '0');
    const endHH = String(Math.floor(slotEndMinutes / 60)).padStart(2, '0');
    const endMM = String(slotEndMinutes % 60).padStart(2, '0');

    const slotStartUTC = istHHMMtoUTC(dateString, `${startHH}:${startMM}`);
    const slotEndUTC = istHHMMtoUTC(dateString, `${endHH}:${endMM}`);

    candidates.push({ startAt: slotStartUTC, endAt: slotEndUTC });
  }

  // 9. Filter: must be at least 1 hour in the future (gives customers reasonable same-day booking window)
  const cutoff = new Date(Date.now() + 1 * 60 * 60 * 1000);
  const futureSlots = candidates.filter((s) => s.startAt >= cutoff);

  // 10. Filter breaks
  const breakFiltered = futureSlots.filter((slot) => {
    for (const br of schedule.breaks || []) {
      const breakStartUTC = istHHMMtoUTC(dateString, br.startTime);
      const breakEndUTC = istHHMMtoUTC(dateString, br.endTime);
      if (slot.startAt < breakEndUTC && slot.endAt > breakStartUTC) {
        return false;
      }
    }
    return true;
  });

  // 11. Filter blockedPeriods
  const unblocked = breakFiltered.filter((slot) => {
    for (const period of schedule.blockedPeriods || []) {
      const periodStart = new Date(period.startAt);
      const periodEnd = new Date(period.endAt);
      if (slot.startAt < periodEnd && slot.endAt > periodStart) {
        return false;
      }
    }
    return true;
  });

  // 12. Check concurrent booking count for each slot
  const available = [];
  for (const slot of unblocked) {
    const count = await Booking.countDocuments({
      startAt: { $lt: slot.endAt },
      endAt: { $gt: slot.startAt },
      status: { $nin: ['cancelled', 'rejected', 'rescheduled'] },
    });
    if (count < schedule.maxConcurrentBookings) {
      available.push({
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
      });
    }
  }

  return available;
}
