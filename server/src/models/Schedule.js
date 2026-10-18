import mongoose from 'mongoose';

const breakSchema = new mongoose.Schema(
  {
    name: { type: String },
    startTime: { type: String, required: true }, // 'HH:MM'
    endTime: { type: String, required: true },   // 'HH:MM'
  },
  { _id: false }
);

const blockedPeriodSchema = new mongoose.Schema(
  {
    label: { type: String },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { _id: false }
);

const holidaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    label: { type: String },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    openingTime: {
      type: String,
      default: '09:00',
    },
    closingTime: {
      type: String,
      default: '19:00',
    },
    slotIntervalMinutes: {
      type: Number,
      default: 30,
    },
    maxConcurrentBookings: {
      type: Number,
      default: 3,
    },
    breaks: {
      type: [breakSchema],
      default: [],
    },
    blockedPeriods: {
      type: [blockedPeriodSchema],
      default: [],
    },
    holidays: {
      type: [holidaySchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
