import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Notification from '../models/Notification.js';
import Schedule from '../models/Schedule.js';
import Vehicle from '../models/Vehicle.js';
import PartnerProfile from '../models/PartnerProfile.js';
import { AppError } from '../middleware/errorHandler.js';
import { notifyBookingConfirmed, notifyWashStarted, notifyWashCompleted, notifyPaymentConfirmed } from '../services/notificationService.js';

// IST offset in ms
const IST_OFFSET_MS = 19800000;

// ---------------------------------------------------------------------------
// GET /api/admin/bookings  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getAdminBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) filter.status = req.query.status;

    if (req.query.date) {
      const dateStr = req.query.date;
      const [year, month, day] = dateStr.split('-').map(Number);
      // IST day boundaries as UTC
      const dayStartUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS);
      const dayEndUTC = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0) - IST_OFFSET_MS);
      filter.startAt = { $gte: dayStartUTC, $lt: dayEndUTC };
    }

    if (req.query.vehicleType) {
      const Vehicle = (await import('../models/Vehicle.js')).default;
      const vehicleIds = await Vehicle.find({ type: req.query.vehicleType }).distinct('_id');
      filter.vehicleId = { $in: vehicleIds };
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const matchingUsers = await User.find({ name: searchRegex }).distinct('_id');
      filter.$or = [
        { bookingReference: searchRegex },
        { customerId: { $in: matchingUsers } },
      ];
    }

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate('customerId', 'name email phone')
      .populate('vehicleId', 'make model licensePlate type color')
      .populate('serviceId', 'name category price duration')
      .sort({ startAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: { bookings, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/bookings/:id/status  (protect + requireAdmin)
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS = {
  // Note: confirmed → in_progress is an intentional manual-dispatch path for admin use.
  // A booking advanced this way may have partnerId: null (no partner assigned).
  // If that is a concern, add a guard here that requires booking.partnerId when targeting in_progress.
  pending: ['confirmed', 'searching_partner', 'rejected', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'rescheduled'],
  searching_partner: ['partner_assigned', 'cancelled'],
  partner_assigned: ['partner_on_way', 'cancelled'],
  partner_on_way: ['partner_arrived', 'cancelled'],
  partner_arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  rescheduled: ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
};

export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!status) {
      return next(new AppError('status is required', 400));
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    const allowed = ALLOWED_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(status)) {
      return next(
        new AppError(
          `Cannot transition from '${booking.status}' to '${status}'. Valid transitions: [${allowed.join(', ')}]`,
          400
        )
      );
    }

    booking.status = status;
    booking.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.user._id,
      note: note || '',
    });

    if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancelledBy = 'admin';
      booking.cancellationReason = note || '';
    }

    await booking.save();

    // Notify customer with status-specific helpers (fire-and-forget)
    if (status === 'confirmed') {
      notifyBookingConfirmed(booking, null).catch(console.error);
    } else if (status === 'in_progress') {
      notifyWashStarted(booking, null).catch(console.error);
    } else if (status === 'completed') {
      notifyWashCompleted(booking, null).catch(console.error);
    } else {
      // cancelled/rejected — notify generically
      Notification.create({
        user: booking.customerId,
        title: 'Booking Update',
        body: `Your booking ${booking.bookingReference} status is now: ${status.replace(/_/g, ' ')}.`,
        type: 'booking',
        data: { bookingId: booking._id },
      }).catch(console.error);
    }

    await booking.populate('customerId', 'name email phone');
    await booking.populate('vehicleId', 'make model licensePlate type');
    await booking.populate('serviceId', 'name category price duration');

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    // IST today boundaries
    const istTodayString = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
    const [y, m, d] = istTodayString.split('-').map(Number);
    const todayStartUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
    const todayEndUTC = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);

    const [
      totalBookings,
      pendingBookings,
      todayAppointments,
      revenueResult,
      activeServices,
      totalCustomers,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ startAt: { $gte: todayStartUTC, $lt: todayEndUTC } }),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$priceAtBooking' } } },
      ]),
      Service.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'customer', isActive: true }),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalBookings,
        pendingBookings,
        todayAppointments,
        totalRevenue,
        activeServices,
        totalCustomers,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/reports  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getAdminReports = async (req, res, next) => {
  try {
    // Today IST boundaries
    const istTodayString = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
    const [ty, tm, td] = istTodayString.split('-').map(Number);
    const todayStartUTC = new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0) - IST_OFFSET_MS);
    const todayEndUTC = new Date(Date.UTC(ty, tm - 1, td + 1, 0, 0, 0) - IST_OFFSET_MS);

    // This month IST boundaries
    const monthStartUTC = new Date(Date.UTC(ty, tm - 1, 1, 0, 0, 0) - IST_OFFSET_MS);
    const monthEndUTC = new Date(Date.UTC(ty, tm, 1, 0, 0, 0) - IST_OFFSET_MS);

    // Last-6-months boundary
    const sixMonthsAgo = new Date(Date.UTC(ty, tm - 7, 1, 0, 0, 0) - IST_OFFSET_MS);

    const [
      totalCustomers,
      totalBookings,
      revenueResult,
      statusCounts,
      todayAppointments,
      monthRevenueResult,
      recentBookings,
      vehicleTypeCounts,
      serviceBookings,
      monthlyRevenueRaw,
    ] = await Promise.all([
      // 1. total active customers
      User.countDocuments({ role: 'customer', isActive: true }),
      // 2. total bookings
      Booking.countDocuments(),
      // 3. total revenue from completed bookings
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$priceAtBooking' } } },
      ]),
      // 4. status breakdown
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      // 5. today appointments
      Booking.countDocuments({ startAt: { $gte: todayStartUTC, $lt: todayEndUTC } }),
      // 6. this month revenue
      Booking.aggregate([
        { $match: { status: 'completed', startAt: { $gte: monthStartUTC, $lt: monthEndUTC } } },
        { $group: { _id: null, total: { $sum: '$priceAtBooking' } } },
      ]),
      // 7. recent bookings (last 10)
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customerId', 'name email')
        .populate('serviceId', 'name')
        .populate('vehicleId', 'make model type licensePlate'),
      // 8. bookings by vehicle type (via Vehicle lookup — vehicleType lives on Vehicle model)
      Booking.aggregate([
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicleId',
            foreignField: '_id',
            as: 'vehicle',
          },
        },
        { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$vehicle.type', count: { $sum: 1 } } },
      ]),
      // 9. bookings by service (with name + revenue)
      Booking.aggregate([
        {
          $lookup: {
            from: 'services',
            localField: 'serviceId',
            foreignField: '_id',
            as: 'service',
          },
        },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: '$serviceId',
            serviceName: { $first: '$service.name' },
            count: { $sum: 1 },
            revenue: { $sum: '$priceAtBooking' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // 10. monthly revenue (last 6 months, completed bookings)
      Booking.aggregate([
        { $match: { status: 'completed', startAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: { date: '$startAt', timezone: '+05:30' } },
              month: { $month: { date: '$startAt', timezone: '+05:30' } },
            },
            revenue: { $sum: '$priceAtBooking' },
            bookings: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const thisMonthRevenue = monthRevenueResult[0]?.total || 0;

    // Build flat status counts
    const statusMap = {};
    statusCounts.forEach(({ _id, count }) => { statusMap[_id] = count; });

    // Build vehicle type map { Car: N, Bike: N, Scooty: N }
    const bookingsByVehicleType = { Car: 0, Bike: 0, Scooty: 0 };
    vehicleTypeCounts.forEach(({ _id, count }) => {
      if (_id && Object.prototype.hasOwnProperty.call(bookingsByVehicleType, _id)) {
        bookingsByVehicleType[_id] = count;
      }
    });

    // Build service list
    const bookingsByService = serviceBookings.map(({ serviceName, count, revenue }) => ({
      serviceName,
      count,
      revenue,
    }));

    // Format monthly revenue as YYYY-MM strings (zero-padded month)
    const monthlyRevenue = monthlyRevenueRaw.map(({ _id, revenue, bookings }) => {
      const m = String(_id.month).padStart(2, '0');
      return { month: `${_id.year}-${m}`, revenue, bookings };
    });

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalBookings,
        totalRevenue,
        thisMonthRevenue,
        completedBookings: statusMap.completed || 0,
        cancelledBookings: statusMap.cancelled || 0,
        pendingBookings: statusMap.pending || 0,
        confirmedBookings: statusMap.confirmed || 0,
        inProgressBookings: statusMap.in_progress || 0,
        todayAppointments,
        bookingsByStatus: statusMap, // kept for backward compat
        bookingsByVehicleType,
        bookingsByService,
        recentBookings,
        monthlyRevenue,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Backward compat alias
export const getReports = getAdminReports;

// ---------------------------------------------------------------------------
// GET /api/admin/schedule  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findOne();
    res.json({ success: true, data: schedule || {} });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/schedule  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const updateSchedule = async (req, res, next) => {
  try {
    const { workingDays, openingTime, closingTime, slotIntervalMinutes, maxConcurrentBookings, breaks } = req.body;

    const timeRegex = /^\d{2}:\d{2}$/;
    if (openingTime && !timeRegex.test(openingTime)) {
      return next(new AppError('openingTime must match HH:MM format', 400));
    }
    if (closingTime && !timeRegex.test(closingTime)) {
      return next(new AppError('closingTime must match HH:MM format', 400));
    }

    const fields = {};
    if (workingDays !== undefined) fields.workingDays = workingDays;
    if (openingTime !== undefined) fields.openingTime = openingTime;
    if (closingTime !== undefined) fields.closingTime = closingTime;
    if (slotIntervalMinutes !== undefined) fields.slotIntervalMinutes = slotIntervalMinutes;
    if (maxConcurrentBookings !== undefined) fields.maxConcurrentBookings = maxConcurrentBookings;
    if (breaks !== undefined) fields.breaks = breaks;

    const schedule = await Schedule.findOneAndUpdate(
      {},
      { $set: fields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/schedule/block  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const addBlockedPeriod = async (req, res, next) => {
  try {
    const { label, startAt, endAt } = req.body;

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime())) {
      return next(new AppError('startAt is not a valid date', 400));
    }
    if (isNaN(endDate.getTime())) {
      return next(new AppError('endAt is not a valid date', 400));
    }
    if (startDate >= endDate) {
      return next(new AppError('startAt must be before endAt', 400));
    }
    if (startDate <= new Date()) {
      return next(new AppError('startAt must be in the future', 400));
    }

    const schedule = await Schedule.findOneAndUpdate(
      {},
      { $push: { blockedPeriods: { label, startAt: startDate, endAt: endDate } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/schedule/block/:periodId  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const removeBlockedPeriod = async (req, res, next) => {
  try {
    const periodId = new mongoose.Types.ObjectId(req.params.periodId);

    const schedule = await Schedule.findOneAndUpdate(
      {},
      { $pull: { blockedPeriods: { _id: periodId } } },
      { new: true }
    );

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/schedule/holiday  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const addHoliday = async (req, res, next) => {
  try {
    const { date, label } = req.body;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new AppError('date must match YYYY-MM-DD format', 400));
    }

    const schedule = await Schedule.findOneAndUpdate(
      {},
      { $push: { holidays: { date, label } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/schedule/holiday/:holidayId  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const removeHoliday = async (req, res, next) => {
  try {
    const holidayId = new mongoose.Types.ObjectId(req.params.holidayId);

    const schedule = await Schedule.findOneAndUpdate(
      {},
      { $pull: { holidays: { _id: holidayId } } },
      { new: true }
    );

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/customers  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getCustomers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const matchFilter = { role: 'customer' };
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      matchFilter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const total = await User.countDocuments(matchFilter);

    const customers = await User.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'customerId',
          as: 'bookings',
        },
      },
      { $addFields: { totalBookings: { $size: '$bookings' } } },
      { $project: { bookings: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    res.json({
      success: true,
      data: { customers, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/customers/:id  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getCustomerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await User.findById(id);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const [bookingStats, vehicles, recentBookings] = await Promise.all([
      Booking.aggregate([
        { $match: { customerId: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]),
      Vehicle.find({ owner: id }),
      Booking.find({ customerId: id })
        .sort({ startAt: -1 })
        .limit(5)
        .populate('serviceId', 'name')
        .populate('vehicleId', 'make model type licensePlate'),
    ]);

    res.json({
      success: true,
      data: {
        customer,
        stats: bookingStats[0] || { total: 0, completed: 0, pending: 0, cancelled: 0 },
        vehicles,
        recentBookings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/vehicles  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getAdminVehicles = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.search) {
      filter.licensePlate = new RegExp(req.query.search, 'i');
    }

    const total = await Vehicle.countDocuments(filter);
    const items = await Vehicle.find(filter)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: { vehicles: items, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/payments  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getPayments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.method) filter.method = req.query.method;
    if (req.query.status) filter.status = req.query.status;

    const total = await Payment.countDocuments(filter);
    const items = await Payment.find(filter)
      .populate({
        path: 'bookingId',
        select: 'bookingReference serviceNameSnapshot startAt customerId',
        populate: { path: 'customerId', select: 'name email phone' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: { payments: items, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/payments/:id/collect  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const recordCODCollection = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }
    if (payment.method !== 'cod') {
      return next(new AppError('Payment is not COD', 400));
    }
    if (payment.status !== 'unpaid') {
      return next(new AppError('Payment already processed', 400));
    }

    payment.status = 'paid';
    payment.collectedAt = new Date();
    payment.collectedBy = req.user._id;
    await payment.save();

    if (!payment.bookingId) {
      // No associated booking — skip notification, still return updated payment
      await payment.populate({
        path: 'bookingId',
        select: 'bookingReference serviceNameSnapshot startAt customerId',
        populate: { path: 'customerId', select: 'name email phone' },
      });
      return res.json({ success: true, data: payment });
    }

    // Update booking payment status
    const booking = await Booking.findByIdAndUpdate(
      payment.bookingId,
      { paymentStatus: 'paid' },
      { new: true }
    );

    // Get customerId
    const customerId = booking ? booking.customerId : payment.customerId;

    // Notify customer (fire-and-forget)
    if (booking) {
      notifyPaymentConfirmed(booking, null).catch(console.error);
    }

    await payment.populate({
      path: 'bookingId',
      select: 'bookingReference serviceNameSnapshot startAt customerId',
      populate: { path: 'customerId', select: 'name email phone' },
    });

    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/partners  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getPartners = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const matchFilter = { role: 'partner' };
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      matchFilter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const total = await User.countDocuments(matchFilter);

    const partners = await User.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'partnerprofiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      { $addFields: { profile: { $arrayElemAt: ['$profile', 0] } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    res.json({
      success: true,
      data: { partners, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/partners/:id  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const getPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partner = await User.findOne({ _id: id, role: 'partner' });
    if (!partner) {
      return next(new AppError('Partner not found', 404));
    }

    const [profile, recentJobs] = await Promise.all([
      PartnerProfile.findOne({ userId: id }),
      Booking.find({ partnerId: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('serviceId', 'name category price')
        .populate('vehicleId', 'make model type licensePlate')
        .populate('customerId', 'name email phone'),
    ]);

    res.json({
      success: true,
      data: {
        partner,
        profile,
        recentJobs,
        stats: {
          completedJobs: profile?.completedJobs || 0,
          totalEarnings: profile?.totalEarnings || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/partners/:id/verify  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const verifyPartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await PartnerProfile.findOneAndUpdate(
      { userId: id },
      { $set: { isVerified: true } },
      { new: true }
    );
    if (!profile) {
      return next(new AppError('Partner profile not found', 404));
    }
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/partners/:id/deactivate  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const deactivatePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role: 'partner' });
    if (!user) {
      return next(new AppError('Partner not found', 404));
    }
    await Promise.all([
      User.findByIdAndUpdate(id, { $set: { isActive: false } }),
      PartnerProfile.findOneAndUpdate({ userId: id }, { $set: { isActive: false } }),
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

