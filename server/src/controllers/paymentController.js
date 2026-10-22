import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import { AppError } from '../middleware/errorHandler.js';
import { notifyPaymentConfirmed } from '../services/notificationService.js';

// ---------------------------------------------------------------------------
// POST /api/payments/create-order  (protect)
// ---------------------------------------------------------------------------
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return next(new AppError('bookingId is required', 400));
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.customerId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to pay for this booking', 403));
    }

    if (booking.paymentMethod !== 'online') {
      return next(new AppError('This booking is not set up for online payment', 400));
    }

    if (!['unpaid', 'failed'].includes(booking.paymentStatus)) {
      return next(new AppError('Payment already processed', 400));
    }

    const payment = await Payment.findOne({ bookingId });
    if (!payment) {
      return next(new AppError('Payment record not found', 404));
    }

    const razorpayConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

    if (!razorpayConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Online payments are not configured. Please use Cash on Delivery.',
        code: 'RAZORPAY_NOT_CONFIGURED',
      });
    }

    // Dynamic import — only when keys are present
    const { default: Razorpay } = await import('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: payment.amount * 100, // paise
      currency: 'INR',
      receipt: bookingId,
    });

    payment.gatewayOrderId = order.id;
    payment.status = 'pending';
    await payment.save();

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingReference: booking.bookingReference,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/payments/verify  (protect)
// ---------------------------------------------------------------------------
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const payment = await Payment.findOne({ gatewayOrderId: razorpay_order_id });
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (payment.customerId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to verify this payment', 403));
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      payment.status = 'paid';
      payment.gatewayPaymentId = razorpay_payment_id;
      payment.gatewaySignature = razorpay_signature;
      payment.transactionReference = razorpay_payment_id;
      await payment.save();

      await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        notifyPaymentConfirmed(booking, null).catch(console.error);
      }

      return res.json({ success: true, data: payment });
    } else {
      payment.status = 'failed';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed — invalid signature',
      });
    }
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/payments/webhook  (no auth)
// ---------------------------------------------------------------------------
export const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret) {
      return res.status(200).json({ received: true });
    }

    const signature = req.headers['x-razorpay-signature'];
    const secret = webhookSecret;

    const expectedSignature = crypto
      .createHmac('sha256', secret || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
      if (payment && payment.status !== 'paid') {
        payment.status = 'paid';
        payment.gatewayPaymentId = paymentEntity.id;
        payment.transactionReference = paymentEntity.id;
        await payment.save();

        await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

        const booking = await Booking.findById(payment.bookingId);
        if (booking) {
          notifyPaymentConfirmed(booking, null).catch(console.error);
        }
      }
    } else if (event === 'payment.failed' && paymentEntity) {
      const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
      if (payment) {
        payment.status = 'failed';
        await payment.save();
      }
    } else if (event === 'refund.processed') {
      const refundEntity = req.body.payload?.refund?.entity;
      if (refundEntity) {
        const payment = await Payment.findOne({ gatewayPaymentId: refundEntity.payment_id });
        if (payment) {
          payment.status = 'refunded';
          payment.refundAmount = refundEntity.amount / 100;
          payment.refundReason = refundEntity.notes?.reason || '';
          payment.refundedAt = new Date();
          await payment.save();
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // Webhook must always return 200
    console.error('[Webhook] Error processing webhook:', err.message);
    return res.status(200).json({ received: true });
  }
};

// ---------------------------------------------------------------------------
// GET /api/payments/my  (protect, paginated)
// ---------------------------------------------------------------------------
export const getMyPayments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { customerId: req.user._id };

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('bookingId', 'bookingReference serviceNameSnapshot startAt status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: { payments, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/payments/:id  (protect, customer ownership check)
// ---------------------------------------------------------------------------
export const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(
      'bookingId',
      'bookingReference serviceNameSnapshot startAt status'
    );

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (req.user.role !== 'admin' && payment.customerId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to view this payment', 403));
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/payments  (protect + requireAdmin, paginated)
// ---------------------------------------------------------------------------
export const getAllPayments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.method) filter.method = req.query.method;

    const total = await Payment.countDocuments(filter);
    const items = await Payment.find(filter)
      .populate('customerId', 'name email phone')
      .populate({
        path: 'bookingId',
        select: 'bookingReference serviceNameSnapshot startAt status',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: { items, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/payments/:id/status  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];

    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    payment.status = status;
    await payment.save();

    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/payments/confirm-upi  (protect)
// ---------------------------------------------------------------------------
export const confirmUPIPayment = async (req, res, next) => {
  try {
    const { bookingId, upiRef } = req.body;
    if (!bookingId) return next(new AppError('bookingId is required', 400));

    const booking = await Booking.findById(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised for this booking', 403));
    }

    let payment = await Payment.findOne({ bookingId });
    if (!payment) {
      payment = await Payment.create({
        bookingId,
        customerId: req.user._id,
        amount: booking.priceAtBooking,
        method: 'upi',
        status: 'pending_verification',
        upiConfirmedAt: new Date(),
        upiRef: upiRef || undefined,
      });
    } else {
      if (['pending_verification', 'paid'].includes(payment.status)) {
        return next(new AppError('Payment confirmation already submitted or payment already verified.', 409));
      }
      payment.method = 'upi';
      payment.status = 'pending_verification';
      payment.upiConfirmedAt = new Date();
      if (upiRef) payment.upiRef = upiRef;
      await payment.save();
    }

    booking.paymentStatus = 'pending_verification';
    await booking.save();

    return res.json({ success: true, data: { status: 'pending_verification' } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/payments/pending  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getPendingVerifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = { status: 'pending_verification' };
    const total = await Payment.countDocuments(filter);
    const items = await Payment.find(filter)
      .populate('bookingId', 'bookingReference serviceNameSnapshot startAt priceAtBooking')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/payments/:id/verify  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const verifyUPIPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(new AppError('Payment not found', 404));
    if (payment.status !== 'pending_verification') {
      return next(new AppError('Payment is not pending verification', 400));
    }
    payment.status = 'paid';
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();
    await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/payments/:id/reject  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const rejectUPIPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(new AppError('Payment not found', 404));
    if (payment.status !== 'pending_verification') {
      return next(new AppError('Payment is not pending verification', 400));
    }
    payment.status = 'unpaid';
    payment.rejectedBy = req.user._id;
    payment.rejectedAt = new Date();
    payment.rejectionReason = req.body.reason || '';
    await payment.save();
    await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'unpaid' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};
