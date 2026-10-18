import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },
    available: { type: Boolean, default: true },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
      unique: true,
    },
    maxBookings: {
      type: Number,
      default: 10,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    slots: {
      type: [slotSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Note: date already has a unique index from the schema field definition above.
// No additional index needed.

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
