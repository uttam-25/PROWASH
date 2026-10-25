import mongoose from 'mongoose';
import { randomBytes } from 'crypto';

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String },
    changedAt: { type: Date, default: () => new Date() },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    clientRequestId: { type: String, unique: true, sparse: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required'],
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
    },
    serviceNameSnapshot: {
      type: String,
      required: [true, 'Service name snapshot is required'],
    },
    priceAtBooking: {
      type: Number,
      required: [true, 'Price at booking is required'],
    },
    startAt: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true,
    },
    endAt: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'searching_partner', 'partner_assigned', 'partner_accepted', 'partner_on_way', 'partner_arrived', 'in_progress', 'completed', 'cancelled', 'rejected', 'rescheduled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'online', 'upi'],
      required: [true, 'Payment method is required'],
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'pending_verification', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },
    notes: {
      type: String,
      trim: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: String,
      enum: ['customer', 'admin'],
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    partnerAssignedAt: { type: Date },
    partnerDistanceKm: { type: Number, min: 0 },
    rejectedPartnerIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    partnerArrivedAt: { type: Date },
    serviceStartedAt: { type: Date },
    serviceCompletedAt: { type: Date },
    customerLocation: {
      address: { type: String, trim: true },
      houseNumber: { type: String, trim: true, maxlength: 120 },
      street: { type: String, trim: true, maxlength: 120 },
      area: { type: String, trim: true, maxlength: 120 },
      city: { type: String, trim: true, maxlength: 120 },
      state: { type: String, trim: true, maxlength: 120 },
      pinCode: { type: String, trim: true, maxlength: 6 },
      landmark: { type: String, trim: true, maxlength: 120 },
      lat: { type: Number },
      lng: { type: Number },
      locationSource: { type: String, enum: ['manual', 'gps', 'geocoded'] },
    },
    locationMatchStatus: {
      type: String,
      enum: ['ready', 'location_required'],
      default: 'location_required',
    },
    beforePhotos: { type: [String], default: [] },
    afterPhotos: { type: [String], default: [] },
    isImmediate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Pre-save hook: generate bookingReference if not set
bookingSchema.pre('save', function (next) {
  if (!this.bookingReference) {
    this.bookingReference =
      'PW' +
      Date.now().toString(36).toUpperCase() +
      randomBytes(3).toString('hex').toUpperCase();
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
