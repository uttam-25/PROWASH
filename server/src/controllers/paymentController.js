import Payment from '../models/Payment.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// GET /api/payments/my  (protect)
// ---------------------------------------------------------------------------
export const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ customer: req.user._id })
      .populate('booking', 'scheduledDate scheduledTime status totalAmount')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: payments });
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
      'booking',
      'scheduledDate scheduledTime status totalAmount'
    );

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (req.user.role !== 'admin' && payment.customer.toString() !== req.user._id.toString()) {
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
      .populate('customer', 'name email phone')
      .populate({
        path: 'booking',
        select: 'scheduledDate scheduledTime status',
        populate: { path: 'service', select: 'name' },
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
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];

    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    payment.status = status;
    if (status === 'paid' && !payment.paidAt) {
      payment.paidAt = new Date();
    }
    await payment.save();

    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};
