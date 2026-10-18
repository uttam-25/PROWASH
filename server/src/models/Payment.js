import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
      unique: true,
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
      enum: ['cod', 'online'],
      default: 'cod',
    },
    status: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'],
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
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
