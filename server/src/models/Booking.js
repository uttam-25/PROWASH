import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required'],
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    scheduledTime: {
      type: String,
      required: [true, 'Scheduled time is required'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
    },
    notes: {
      type: String,
      trim: true,
    },
    cancelReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
