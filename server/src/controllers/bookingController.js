import Booking from '../models/Booking.js';
import Vehicle from '../models/Vehicle.js';
import Service from '../models/Service.js';
import Payment from '../models/Payment.js';
import Schedule from '../models/Schedule.js';
import { getAvailableSlots, updateSlotAvailability } from '../services/availabilityService.js';
import { sendPushNotification } from '../services/notificationService.js';
import { AppError } from '../middleware/errorHandler.js';

// Helper — format date to YYYY-MM-DD string
const toDateString = (date) => new Date(date).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// POST /api/bookings  (protect)
// ---------------------------------------------------------------------------
export const createBooking = async (req, res, next) => {
  try {
    const { vehicleId, serviceId, scheduledDate, scheduledTime, notes, paymentMethod } = req.body;

    // Verify vehicle ownership
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || !vehicle.isActive) {
      return next(new AppError('Vehicle not found', 404));
    }
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised — this vehicle does not belong to you', 403));
    }

    // Verify service is active
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return next(new AppError('Service not found or is no longer available', 404));
    }

    // Check slot availability
    const dateStr = toDateString(scheduledDate);
    const slots = await getAvailableSlots(dateStr);
    const slot = slots.find((s) => s.time === scheduledTime);
    if (!slot) {
      return next(new AppError('The requested time slot does not exist', 400));
    }
    if (!slot.available) {
      return next(new AppError('The requested time slot is not available', 400));
    }

    // Create booking
    const booking = await Booking.create({
      customer: req.user._id,
      vehicle: vehicleId,
      service: serviceId,
      scheduledDate: new Date(`${dateStr}T00:00:00.000Z`),
      scheduledTime,
      totalAmount: service.price,
      notes,
    });

    // Create pending payment
    const method = paymentMethod === 'razorpay' ? 'razorpay' : 'cod';
    await Payment.create({
      booking: booking._id,
      customer: req.user._id,
      amount: service.price,
      method,
    });

    // Increment bookedCount on Schedule
    await Schedule.updateOne(
      { date: new Date(`${dateStr}T00:00:00.000Z`) },
      { $inc: { bookedCount: 1 } }
    );

    // Notify customer
    await sendPushNotification(
      req.user._id,
      'Booking Confirmed',
      `Your ${service.name} booking for ${dateStr} at ${scheduledTime} is pending confirmation.`,
      'booking'
    );

    const populated = await Booking.findById(booking._id)
      .populate('vehicle', 'type make model licensePlate color')
      .populate('service', 'name category price duration');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/bookings/my  (protect)
// ---------------------------------------------------------------------------
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate('vehicle', 'type make model licensePlate color')
      .populate('service', 'name category price duration imageUrl')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/bookings/:id  (protect, customer ownership check)
// ---------------------------------------------------------------------------
export const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('vehicle', 'type make model licensePlate color photo')
      .populate('service', 'name category price duration imageUrl description');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Admins can see any booking; customers only their own
    if (req.user.role !== 'admin' && booking.customer.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to view this booking', 403));
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/bookings/:id/cancel  (protect)
// ---------------------------------------------------------------------------
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to cancel this booking', 403));
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return next(new AppError('Only pending or confirmed bookings can be cancelled', 400));
    }

    const { cancelReason } = req.body;
    if (!cancelReason || !cancelReason.trim()) {
      return next(new AppError('A cancellation reason is required', 400));
    }

    booking.status = 'cancelled';
    booking.cancelReason = cancelReason.trim();
    await booking.save();

    // Decrement bookedCount
    const dateStr = toDateString(booking.scheduledDate);
    await Schedule.updateOne(
      { date: new Date(`${dateStr}T00:00:00.000Z`) },
      { $inc: { bookedCount: -1 } }
    );

    // Re-open the slot
    await updateSlotAvailability(dateStr, booking.scheduledTime, true);

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/bookings  (protect + requireAdmin, paginated)
// ---------------------------------------------------------------------------
export const getAllBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const dateStr = req.query.date;
      const start = new Date(`${dateStr}T00:00:00.000Z`);
      const end = new Date(`${dateStr}T23:59:59.999Z`);
      filter.scheduledDate = { $gte: start, $lte: end };
    }

    const total = await Booking.countDocuments(filter);
    const items = await Booking.find(filter)
      .populate('customer', 'name email phone')
      .populate('vehicle', 'type make model licensePlate color')
      .populate('service', 'name category price duration')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: { bookings: items, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/bookings/:id/status  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('service', 'name');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    booking.status = status;
    await booking.save();

    // Notify customer of status change
    await sendPushNotification(
      booking.customer._id,
      'Booking Update',
      `Your booking for ${booking.service?.name || 'service'} is now ${status.replace('_', ' ')}.`,
      'booking'
    );

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};
