import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
      unique: true,
    },
    // Kept in sync for databases that still have the legacy unique `booking` index.
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      select: false,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    method: {
      type: String,
      enum: ['cod', 'online', 'upi'],
      default: 'cod',
    },
    status: {
      type: String,
      enum: ['unpaid', 'pending', 'pending_verification', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },
    gatewayOrderId: {
      type: String,
    },
    gatewayPaymentId: {
      type: String,
    },
    gatewaySignature: {
      type: String,
    },
    transactionReference: {
      type: String,
    },
    collectedAt: {
      type: Date,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    refundAmount: {
      type: Number,
    },
    refundReason: {
      type: String,
    },
    refundedAt: {
      type: Date,
    },
    upiConfirmedAt: { type: Date },
    upiRef: { type: String },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
