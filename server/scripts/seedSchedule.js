/**
 * seedSchedule.js
 * Upserts the default Schedule document for development.
 * Run: node scripts/seedSchedule.js   (from server/ directory)
 *
 * Safe to run multiple times — only creates/updates the single active schedule.
 * Never deletes customer bookings.
 */
import 'dotenv/config';
import connectDB from '../src/config/db.js';
import Schedule from '../src/models/Schedule.js';

const DEFAULT_SCHEDULE = {
  timezone: 'Asia/Kolkata',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  openingTime: '08:00',  // 8:00 AM IST
  closingTime: '20:00',  // 8:00 PM IST
  slotIntervalMinutes: 30,
  maxConcurrentBookings: 3,
  breaks: [],
  blockedPeriods: [],
  holidays: [],
  isActive: true,
};

async function seed() {
  await connectDB();

  const existing = await Schedule.findOne({ isActive: true });

  if (existing) {
    // Update to ensure correct dev hours
    existing.workingDays = DEFAULT_SCHEDULE.workingDays;
    existing.openingTime = DEFAULT_SCHEDULE.openingTime;
    existing.closingTime = DEFAULT_SCHEDULE.closingTime;
    existing.slotIntervalMinutes = DEFAULT_SCHEDULE.slotIntervalMinutes;
    existing.maxConcurrentBookings = DEFAULT_SCHEDULE.maxConcurrentBookings;
    existing.timezone = DEFAULT_SCHEDULE.timezone;
    await existing.save();
    console.log('✅ Schedule updated:', existing._id.toString());
    console.log('   Working days:', existing.workingDays.join(', '));
    console.log('   Hours:', existing.openingTime, '–', existing.closingTime, 'IST');
    console.log('   Slot interval:', existing.slotIntervalMinutes, 'min');
    console.log('   Max concurrent bookings:', existing.maxConcurrentBookings);
  } else {
    const schedule = await Schedule.create(DEFAULT_SCHEDULE);
    console.log('✅ Schedule created:', schedule._id.toString());
    console.log('   Working days:', schedule.workingDays.join(', '));
    console.log('   Hours:', schedule.openingTime, '–', schedule.closingTime, 'IST');
    console.log('   Slot interval:', schedule.slotIntervalMinutes, 'min');
    console.log('   Max concurrent bookings:', schedule.maxConcurrentBookings);
  }

  console.log('\n📅 Slots generated per day:');
  const open = 8 * 60;  // 480 minutes
  const close = 20 * 60; // 1200 minutes
  const interval = 30;
  let count = 0;
  for (let t = open; t + 30 <= close; t += interval) count++;
  console.log('   ~' + count + ' slots per working day (before capacity and time-of-day filters)');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
