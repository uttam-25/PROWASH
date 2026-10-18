import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// GET /api/admin/customers  (protect + requireAdmin, paginated)
// ---------------------------------------------------------------------------
export const getAllCustomers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { role: 'customer' };
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === 'true';
    }

    const total = await User.countDocuments(filter);
    const items = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires')
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
// GET /api/admin/customers/:id  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getCustomer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -resetPasswordToken -resetPasswordExpires'
    );

    if (!user || user.role !== 'customer') {
      return next(new AppError('Customer not found', 404));
    }

    // Fetch recent bookings
    const recentBookings = await Booking.find({ customer: user._id })
      .populate('service', 'name category price')
      .populate('vehicle', 'type make model')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: { customer: user, recentBookings },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/customers/:id/toggle  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const toggleCustomerActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'customer') {
      return next(new AppError('Customer not found', 404));
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: { _id: user._id, isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
};
