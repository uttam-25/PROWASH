import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// GET /api/admin/reports  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getReports = async (req, res, next) => {
  try {
    const now = new Date();

    // Today boundaries (UTC)
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    // This month boundaries
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // Total bookings
    const totalBookings = await Booking.countDocuments();

    // Bookings by status
    const statusCounts = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const bookingsByStatus = {};
    statusCounts.forEach(({ _id, count }) => {
      bookingsByStatus[_id] = count;
    });

    // Total revenue (sum of paid payments)
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Today's booking count
    const todayBookings = await Booking.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
    });

    // This month's revenue
    const monthRevenueResult = await Payment.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthRevenue = monthRevenueResult[0]?.total || 0;

    // Total active customers
    const totalActiveCustomers = await User.countDocuments({ role: 'customer', isActive: true });

    res.json({
      success: true,
      data: {
        totalBookings,
        bookingsByStatus,
        totalRevenue,
        todayBookings,
        thisMonthRevenue: monthRevenue,
        totalCustomers: totalActiveCustomers,
      },
    });
  } catch (err) {
    next(err);
  }
};
