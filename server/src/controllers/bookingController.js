import Booking from '../models/Booking.js';
import Vehicle from '../models/Vehicle.js';
import Service from '../models/Service.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import { notifyBookingCreated, notifyBookingCancelled } from '../services/notificationService.js';
import { getAvailableSlots } from '../services/availabilityService.js';
import { AppError } from '../middleware/errorHandler.js';

// Helper: get IST date string 'YYYY-MM-DD' from a Date or ISO string
function toISTDateString(dateInput) {
  return new Date(new Date(dateInput).getTime() + 19800000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// POST /api/bookings  (protect)
// ---------------------------------------------------------------------------
export const createBooking = async (req, res, next) => {
  try {
    const { vehicleId, serviceId, startAt: startAtRaw, paymentMethod, notes } = req.body;

    // Basic validation
    if (!vehicleId || !serviceId || !startAtRaw || !paymentMethod) {
      return next(new AppError('vehicleId, serviceId, startAt and paymentMethod are required', 400));
    }
    if (!['cod', 'online'].includes(paymentMethod)) {
      return next(new AppError("paymentMethod must be 'cod' or 'online'", 400));
    }

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

    const startAt = new Date(startAtRaw);
    if (isNaN(startAt.getTime())) {
      return next(new AppError('startAt must be a valid ISO date string', 400));
    }

    const endAt = new Date(startAt.getTime() + service.duration * 60000);

    // Server-side availability re-check
    const dateString = toISTDateString(startAt);
    const slots = await getAvailableSlots(serviceId, dateString);
    const slotMatch = slots.find((s) => s.startAt === startAt.toISOString());

    if (!slotMatch) {
      return res.status(409).json({
        success: false,
        message: 'Slot no longer available',
        alternatives: slots.slice(0, 3),
      });
    }

    // Create booking
    const booking = await Booking.create({
      customerId: req.user._id,
      vehicleId,
      serviceId,
      serviceNameSnapshot: service.name,
      priceAtBooking: service.price,
      startAt,
      endAt,
      paymentMethod,
      notes,
      status: 'pending',
      paymentStatus: 'unpaid',
      statusHistory: [
        { status: 'pending', changedAt: new Date(), changedBy: req.user._id },
      ],
    });

    // Create payment record
    await Payment.create({
      bookingId: booking._id,
      customerId: req.user._id,
      amount: service.price,
      method: paymentMethod, // 'cod' or 'online' — matches schema enum
    });

    // Notify customer (fire-and-forget)
    notifyBookingCreated(booking, req.user).catch(console.error);

    // Populate and return
    const populated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('vehicleId', 'make model licensePlate type color')
      .populate('serviceId', 'name category price duration');

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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { customerId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate('vehicleId', 'make model licensePlate type color')
      .populate('serviceId', 'name category price duration imageUrl')
      .sort({ startAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: {
        bookings,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/bookings/:id  (protect)
// ---------------------------------------------------------------------------
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('vehicleId', 'type make model licensePlate color photo')
      .populate('serviceId', 'name category price duration imageUrl description');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (req.user.role !== 'admin' && booking.customerId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to view this booking', 403));
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// Keep old name as alias for admin routes that reference it
export const getBooking = getBookingById;

// ---------------------------------------------------------------------------
// PATCH /api/bookings/:id/cancel  (protect)
// ---------------------------------------------------------------------------
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.customerId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to cancel this booking', 403));
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return next(new AppError('Only pending or confirmed bookings can be cancelled', 400));
    }

    const reason = (req.body.reason || req.body.cancellationReason || '').trim();
    if (!reason) {
      return next(new AppError('A cancellation reason is required', 400));
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'customer';
    booking.cancellationReason = reason;
    booking.statusHistory.push({
      status: 'cancelled',
      changedAt: new Date(),
      changedBy: req.user._id,
      note: reason,
    });
    await booking.save();

    // Notify customer (fire-and-forget)
    notifyBookingCancelled(booking, req.user).catch(console.error);

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/bookings/:id/reschedule  (protect)
// ---------------------------------------------------------------------------
export const rescheduleBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.customerId.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to reschedule this booking', 403));
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return next(new AppError('Only pending or confirmed bookings can be rescheduled', 400));
    }

    const newStartAtRaw = req.body.newStartAt || req.body.startAt;
    if (!newStartAtRaw) {
      return next(new AppError('newStartAt is required', 400));
    }

    const newStartAt = new Date(newStartAtRaw);
    if (isNaN(newStartAt.getTime())) {
      return next(new AppError('newStartAt must be a valid ISO date string', 400));
    }

    const service = await Service.findById(booking.serviceId);
    if (!service) {
      return next(new AppError('Service not found', 404));
    }

    const newEndAt = new Date(newStartAt.getTime() + service.duration * 60000);
    const dateString = toISTDateString(newStartAt);
    const slots = await getAvailableSlots(booking.serviceId.toString(), dateString);
    const slotMatch = slots.find((s) => s.startAt === newStartAt.toISOString());

    if (!slotMatch) {
      return res.status(409).json({
        success: false,
        message: 'Slot no longer available',
        alternatives: slots.slice(0, 3),
      });
    }

    booking.startAt = newStartAt;
    booking.endAt = newEndAt;
    booking.status = 'rescheduled';
    booking.statusHistory.push({
      status: 'rescheduled',
      changedAt: new Date(),
      changedBy: req.user._id,
      note: `Rescheduled to ${newStartAt.toISOString()}`,
    });
    await booking.save();

    // Notify customer
    await Notification.create({
      user: req.user._id,
      title: 'Booking Rescheduled',
      body: `Your booking ${booking.bookingReference} has been rescheduled.`,
      type: 'booking',
      data: { bookingId: booking._id },
    });

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};
