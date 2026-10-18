import Schedule from '../models/Schedule.js';

/**
 * Generate the default time slots for a day.
 * Every 30 minutes from 08:00 to 18:00.
 * @returns {string[]} array of time strings like '08:00', '08:30', ...
 */
const generateDefaultSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 18; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 18) {
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
  }
  return slots;
};

/**
 * Get available slots for a given date string (YYYY-MM-DD).
 * Finds or creates the Schedule document for that date.
 * Returns an array of { time: string, available: boolean }.
 *
 * A slot is unavailable when:
 *  - slot.available === false (manually blocked)
 *  - the schedule's bookedCount >= maxBookings
 *
 * @param {string} dateString - 'YYYY-MM-DD'
 * @returns {Promise<Array<{ time: string, available: boolean }>>}
 */
export const getAvailableSlots = async (dateString) => {
  // Parse the date at midnight UTC to avoid timezone issues with unique index
  const date = new Date(`${dateString}T00:00:00.000Z`);

  let schedule = await Schedule.findOne({ date });

  if (!schedule) {
    const defaultSlots = generateDefaultSlots().map((t) => ({
      time: t,
      available: true,
    }));
    schedule = await Schedule.create({ date, slots: defaultSlots });
  }

  const dayFull = schedule.bookedCount >= schedule.maxBookings;

  return schedule.slots.map((slot) => ({
    time: slot.time,
    available: schedule.isOpen && !dayFull && slot.available,
  }));
};

/**
 * Update the availability of a specific time slot.
 * Used when a booking is cancelled to re-open the slot.
 *
 * @param {string} dateString - 'YYYY-MM-DD'
 * @param {string} time - e.g. '09:00'
 * @param {boolean} available
 * @returns {Promise<void>}
 */
export const updateSlotAvailability = async (dateString, time, available) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);

  await Schedule.updateOne(
    { date, 'slots.time': time },
    { $set: { 'slots.$.available': available } }
  );
};
