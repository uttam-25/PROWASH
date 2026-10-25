import Booking from '../models/Booking.js';
import Vehicle from '../models/Vehicle.js';
import Schedule from '../models/Schedule.js';
import Service from '../models/Service.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import { notifyBookingCreated, notifyBookingCancelled } from '../services/notificationService.js';
import { getAvailableSlots } from '../services/availabilityService.js';
import { assignPendingBookings, tryAssignPartner } from '../services/partnerAssignmentService.js';
import { AppError } from '../middleware/errorHandler.js';
import { randomUUID } from 'crypto';
import { geocodeAddress, reverseGeocodeCoordinates } from '../services/geocodingService.js';

function getAddressParts(location = {}) {
  return {
    houseNumber: typeof location.houseNumber === 'string' ? location.houseNumber.trim() : '',
    street: typeof location.street === 'string' ? location.street.trim() : '',
    area: typeof location.area === 'string' ? location.area.trim() : '',
    city: typeof location.city === 'string' ? location.city.trim() : '',
    state: typeof location.state === 'string' ? location.state.trim() : '',
    pinCode: typeof location.pinCode === 'string' ? location.pinCode.trim() : '',
    landmark: typeof location.landmark === 'string' ? location.landmark.trim() : '',
  };
}

function formatAddress(parts) {
  return [
    parts.houseNumber,
    parts.street,
    parts.area,
    parts.landmark ? `Near ${parts.landmark}` : '',
    parts.city,
    parts.state,
    parts.pinCode,
  ].filter(Boolean).join(', ');
}

async function withBookingCapacityLock(callback) {
  if (!(await Schedule.exists({ isActive: true }))) {
    await new Schedule({ isActive: true }).save();
  }

  const now = new Date();
  const lockId = randomUUID();
  const schedule = await Schedule.findOneAndUpdate(
    {
      isActive: true,
      $or: [
        { bookingLockUntil: { $exists: false } },
        { bookingLockUntil: null },
        { bookingLockUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        bookingLockId: lockId,
        bookingLockUntil: new Date(now.getTime() + 60000),
      },
    },
    { new: true }
  );

  if (!schedule) return null;
  try {
    return await callback();
  } finally {
    await Schedule.updateOne(
      { _id: schedule._id, bookingLockId: lockId },
      { $unset: { bookingLockId: 1, bookingLockUntil: 1 } }
    );
  }
}

async function populateBooking(bookingId) {
  return Booking.findById(bookingId)
    .populate('customerId', 'name email phone')
    .populate('vehicleId', 'make model licensePlate type color')
    .populate('serviceId', 'name category price duration')
    .populate('partnerId', 'name phone');
}

async function ensurePaymentForBooking(booking, customerId) {
  await Payment.updateOne(
    { bookingId: booking._id },
    {
      $setOnInsert: {
        bookingId: booking._id,
        booking: booking._id,
        customerId,
        amount: booking.priceAtBooking,
        method: booking.paymentMethod,
      },
    },
    { upsert: true, runValidators: true }
  );
}

// Helper: get IST date string 'YYYY-MM-DD' from a Date or ISO string
function toISTDateString(dateInput) {
  return new Date(new Date(dateInput).getTime() + 19800000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// POST /api/bookings  (protect)
// ---------------------------------------------------------------------------
export const createBooking = async (req, res, next) => {
  let clientRequestId;
  try {
    const { vehicleId, serviceId, startAt: startAtRaw, paymentMethod, notes, customerLocation } = req.body;
    clientRequestId = req.get('Idempotency-Key');

    // Basic validation
    if (!vehicleId || !serviceId || !startAtRaw || !paymentMethod) {
      return next(new AppError('vehicleId, serviceId, startAt and paymentMethod are required', 400));
    }
    if (!['cod', 'online', 'upi'].includes(paymentMethod)) {
      return next(new AppError("paymentMethod must be 'cod', 'online', or 'upi'", 400));
    }
    if (
      clientRequestId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientRequestId)
    ) {
      return next(new AppError('Idempotency-Key must be a UUID', 400));
    }

    if (clientRequestId) {
      const existing = await Booking.findOne({ customerId: req.user._id, clientRequestId });
      if (existing) {
        await ensurePaymentForBooking(existing, req.user._id);
        return res.status(200).json({ success: true, data: await populateBooking(existing._id) });
      }
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
    if (!service.vehicleTypes.includes(vehicle.type)) {
      return next(new AppError('This service is not available for the selected vehicle type', 400));
    }

    const addressParts = getAddressParts(customerLocation);
    const structuredAddress = [
      addressParts.houseNumber,
      addressParts.street,
      addressParts.area,
      addressParts.city,
      addressParts.state,
      addressParts.pinCode,
    ].every(Boolean);
    if (customerLocation && Object.keys(addressParts).some((key) => customerLocation[key])) {
      if (!structuredAddress) {
        return next(new AppError('Enter house/building, street, area, city, state and PIN code', 400));
      }
      if (!/^[1-9]\d{5}$/.test(addressParts.pinCode)) {
        return next(new AppError('Enter a valid 6-digit PIN code', 400));
      }
    }
    const address = structuredAddress
      ? formatAddress(addressParts)
      : typeof customerLocation?.address === 'string'
        ? customerLocation.address.trim()
        : '';
    if (!address) {
      return next(new AppError('A complete service address is required', 400));
    }
    const hasLat = customerLocation?.lat !== undefined && customerLocation?.lat !== null &&
      String(customerLocation.lat).trim() !== '';
    const hasLng = customerLocation?.lng !== undefined && customerLocation?.lng !== null &&
      String(customerLocation.lng).trim() !== '';
    const lat = hasLat ? Number(customerLocation.lat) : NaN;
    const lng = hasLng ? Number(customerLocation.lng) : NaN;
    if (hasLat !== hasLng) {
      return next(new AppError('Both latitude and longitude must be provided together', 400));
    }
    if (hasLat && (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180)) {
      return next(new AppError('Latitude or longitude is outside the valid range', 400));
    }
    if (!structuredAddress && !hasLat) {
      return next(new AppError('Enter house/building, street, area, city, state and PIN code', 400));
    }

    if (typeof startAtRaw !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/i.test(startAtRaw)) {
      return next(new AppError('startAt must include an explicit timezone offset', 400));
    }
    const startAt = new Date(startAtRaw);
    if (isNaN(startAt.getTime())) {
      return next(new AppError('startAt must be a valid ISO date string', 400));
    }

    let resolvedLat = hasLat ? lat : undefined;
    let resolvedLng = hasLng ? lng : undefined;
    let locationSource = customerLocation?.locationSource === 'gps' && hasLat
      ? 'gps'
      : customerLocation?.locationSource === 'geocoded' && hasLat
        ? 'geocoded'
        : 'manual';
    let locationMatchStatus = hasLat ? 'ready' : 'location_required';
    if (!hasLat) {
      try {
        const geocoded = await geocodeAddress(address);
        if (geocoded && Number.isFinite(geocoded.lat) && Number.isFinite(geocoded.lng) &&
            geocoded.lat >= -90 && geocoded.lat <= 90 && geocoded.lng >= -180 && geocoded.lng <= 180) {
          resolvedLat = geocoded.lat;
          resolvedLng = geocoded.lng;
          locationSource = 'geocoded';
          locationMatchStatus = 'ready';
        }
      } catch (geocodingError) {
        console.warn('[Geocoding] Could not resolve booking address:', geocodingError.message);
      }
    }

    const dateString = toISTDateString(startAt);
    const bookingResult = await withBookingCapacityLock(async () => {
      if (clientRequestId) {
        const existing = await Booking.findOne({ customerId: req.user._id, clientRequestId });
        if (existing) return { existing };
      }

      const slots = await getAvailableSlots(serviceId, dateString);
      const slotMatch = slots.find(
        (slot) => Math.abs(new Date(slot.startAt).getTime() - startAt.getTime()) < 60000
      );
      if (!slotMatch) return { slots };

      const canonicalStartAt = new Date(slotMatch.startAt);
      const canonicalEndAt = new Date(slotMatch.endAt);
      const conflictingBooking = await Booking.exists({
        vehicleId,
        status: {
          $in: [
            'pending',
            'confirmed',
            'searching_partner',
            'partner_assigned',
            'partner_accepted',
            'partner_on_way',
            'partner_arrived',
            'in_progress',
          ],
        },
        startAt: { $lt: canonicalEndAt },
        endAt: { $gt: canonicalStartAt },
      });
      if (conflictingBooking) return { conflict: true };

      const created = await Booking.create({
        customerId: req.user._id,
        ...(clientRequestId ? { clientRequestId } : {}),
        vehicleId,
        serviceId,
        serviceNameSnapshot: service.name,
        priceAtBooking: service.price,
        startAt: canonicalStartAt,
        endAt: canonicalEndAt,
        paymentMethod,
        notes,
        customerLocation: {
          address,
          ...addressParts,
          ...(resolvedLat !== undefined ? { lat: resolvedLat, lng: resolvedLng } : {}),
          locationSource,
        },
        locationMatchStatus,
        status: req.body.isImmediate === true ? 'searching_partner' : 'pending',
        isImmediate: req.body.isImmediate === true,
        paymentStatus: 'unpaid',
        statusHistory: [
          { status: 'pending', changedAt: new Date(), changedBy: req.user._id },
          ...(req.body.isImmediate === true
            ? [{ status: 'searching_partner', changedAt: new Date(), changedBy: req.user._id }]
            : []),
        ],
      });

      return { booking: created };
    });

    if (!bookingResult) {
      return next(new AppError('Booking system is busy. Please retry in a moment.', 503));
    }
    if (bookingResult.existing) {
      await ensurePaymentForBooking(bookingResult.existing, req.user._id);
      return res.status(200).json({
        success: true,
        data: await populateBooking(bookingResult.existing._id),
      });
    }
    if (bookingResult.conflict) {
      return res.status(409).json({
        success: false,
        message: 'This vehicle already has a booking that overlaps this time.',
      });
    }
    if (bookingResult.slots) {
      return res.status(409).json({
        success: false,
        message: 'Slot no longer available',
        alternatives: bookingResult.slots.slice(0, 3),
      });
    }
    const booking = bookingResult.booking;

    // Create payment record
    await ensurePaymentForBooking(booking, req.user._id);

    // Notify customer (fire-and-forget)
    notifyBookingCreated(booking, req.user).catch(console.error);

    const populatedForAssignment = await Booking.findById(booking._id)
      .populate('vehicleId', 'type make model')
      .populate('serviceId', 'name category vehicleTypes');
    try {
      await tryAssignPartner(populatedForAssignment);
    } catch (err) {
      console.error('[PartnerAssignment] Booking remains pending:', err);
    }

    // Populate and return
    const populated = await populateBooking(booking._id);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.code === 11000 && clientRequestId) {
      try {
        const existing = await Booking.findOne({ customerId: req.user._id, clientRequestId });
        if (existing) {
          await ensurePaymentForBooking(existing, req.user._id);
          return res.status(200).json({ success: true, data: await populateBooking(existing._id) });
        }
      } catch (recoveryError) {
        return next(recoveryError);
      }
    }
    next(err);
  }
};

export const reverseGeocodeServiceLocation = async (req, res, next) => {
  try {
    const rawLat = req.body?.lat;
    const rawLng = req.body?.lng;
    if (rawLat === undefined || rawLat === null || String(rawLat).trim() === '' ||
        rawLng === undefined || rawLng === null || String(rawLng).trim() === '') {
      return next(new AppError('Valid latitude and longitude are required', 400));
    }
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return next(new AppError('Valid latitude and longitude are required', 400));
    }

    const result = await reverseGeocodeCoordinates(lat, lng);
    if (!result) {
      return res.status(503).json({
        success: false,
        message: 'Reverse geocoding did not return an address',
      });
    }
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Geocoding] Reverse lookup failed:', err.message);
    return next(new AppError('Reverse geocoding is temporarily unavailable', 503));
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
      .populate('partnerId', 'name phone')
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
      .populate('serviceId', 'name category price duration imageUrl description')
      .populate('partnerId', 'name phone')
      .populate({ path: 'statusHistory.changedBy', select: 'name' });

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

    if (!['pending', 'confirmed', 'searching_partner', 'partner_assigned'].includes(booking.status)) {
      return next(new AppError('This booking can no longer be cancelled', 400));
    }

    const reason = (req.body.reason || req.body.cancellationReason || '').trim()
    const cancelledAt = new Date();
    const cancelled = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        customerId: req.user._id,
        status: { $in: ['pending', 'confirmed', 'searching_partner', 'partner_assigned'] },
      },
      {
        $set: {
          status: 'cancelled',
          cancelledAt,
          cancelledBy: 'customer',
          cancellationReason: reason,
        },
        $push: {
          statusHistory: {
            status: 'cancelled',
            changedAt: cancelledAt,
            changedBy: req.user._id,
            note: reason,
          },
        },
      },
      { new: true }
    );
    if (!cancelled) {
      return next(new AppError('Booking status changed before cancellation; refresh and try again', 409));
    }

    // Notify customer (fire-and-forget)
    notifyBookingCancelled(cancelled, req.user).catch(console.error);
    assignPendingBookings().catch((err) => console.error('[PartnerAssignment] Retry after cancellation failed:', err));

    res.json({ success: true, data: cancelled });
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
    const newStartAtMs = newStartAt.getTime();
    const slotMatch = slots.find((s) => Math.abs(new Date(s.startAt).getTime() - newStartAtMs) < 60000);

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
