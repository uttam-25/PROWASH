import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PartnerProfile from '../models/PartnerProfile.js';
import Booking from '../models/Booking.js';
import { AppError } from '../middleware/errorHandler.js';
import { assignPendingBookings, tryAssignPartner, withPartnerAssignmentLock } from '../services/partnerAssignmentService.js';

// Generate JWT — same pattern as authController. Includes `role` so Socket.IO
// can gate role-scoped rooms (e.g. the `partners` broadcast room).
function signToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// ---------------------------------------------------------------------------
// POST /api/partner/register
// ---------------------------------------------------------------------------
export const registerPartner = async (req, res, next) => {
  try {
    const { name, email, password, phone, serviceCategories, supportedServiceIds } = req.body;

    if (!name || !email || !password || !phone) {
      return next(new AppError('name, email, password and phone are required', 400));
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return next(new AppError('An account with this email already exists', 409));
    }

    const user = await User.create({ name, email, password, phone, role: 'partner' });

    const categories = Array.isArray(serviceCategories) ? serviceCategories : [];
    const profile = await PartnerProfile.create({
      userId: user._id,
      phone,
      serviceCategories: categories,
      supportedServiceIds: Array.isArray(supportedServiceIds) ? supportedServiceIds : [],
    });

    const token = signToken(user._id, user.role);
    const safeUser = { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone };

    res.status(201).json({ success: true, token, data: { user: safeUser, profile } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/partner/profile
// ---------------------------------------------------------------------------
export const getPartnerProfile = async (req, res, next) => {
  try {
    const profile = await PartnerProfile.findOne({ userId: req.user._id }).populate('supportedServiceIds', 'name');
    if (!profile) {
      return next(new AppError('Partner profile not found', 404));
    }
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/partner/profile
// ---------------------------------------------------------------------------
export const updatePartnerProfile = async (req, res, next) => {
  try {
    const allowed = ['phone', 'vehicleOwned', 'serviceCategories', 'supportedServiceIds', 'serviceAddress', 'serviceRadius', 'bankDetails'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    if (updates.serviceAddress !== undefined && typeof updates.serviceAddress !== 'string') {
      return next(new AppError('serviceAddress must be a string', 400));
    }
    if (updates.serviceAddress !== undefined && !updates.serviceAddress.trim()) {
      updates.isAvailable = false;
    }
    if (updates.serviceCategories !== undefined && !Array.isArray(updates.serviceCategories)) {
      return next(new AppError('serviceCategories must be an array', 400));
    }
    if (updates.supportedServiceIds !== undefined && !Array.isArray(updates.supportedServiceIds)) {
      return next(new AppError('supportedServiceIds must be an array', 400));
    }

    const profile = await withPartnerAssignmentLock(req.user._id, async () =>
      PartnerProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $set: updates },
        { new: true, runValidators: true }
      )
    );
    if (!profile) {
      return next(new AppError('Partner profile is busy; retry the update', 409));
    }
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/partner/location
// ---------------------------------------------------------------------------
export const updateLocation = async (req, res, next) => {
  try {
    const { lat: rawLat, lng: rawLng, serviceAddress } = req.body;
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (
      rawLat === undefined || rawLat === null || String(rawLat).trim() === '' ||
      rawLng === undefined || rawLng === null || String(rawLng).trim() === '' ||
      !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lng) || lng < -180 || lng > 180 ||
      typeof serviceAddress !== 'string' || !serviceAddress.trim()
    ) {
      return next(new AppError('A service address and valid latitude/longitude are required', 400));
    }
    const profile = await withPartnerAssignmentLock(req.user._id, async () =>
      PartnerProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $set: {
          'currentLocation.coordinates': [lng, lat],
          serviceAddress: serviceAddress.trim(),
          locationUpdatedAt: new Date(),
        } },
        { new: true, runValidators: true }
      )
    );
    if (!profile) {
      return next(new AppError('Partner profile is busy; retry the location update', 409));
    }
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/partner/availability
// ---------------------------------------------------------------------------
export const toggleAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') {
      return next(new AppError('isAvailable must be true or false', 400));
    }
    let availabilityError = null;
    const profile = await withPartnerAssignmentLock(req.user._id, async (lockedProfile) => {
      if (isAvailable && !lockedProfile.isVerified) {
        availabilityError = new AppError('Your account must be verified before going online', 403);
        return null;
      }
      if (isAvailable && (!lockedProfile.locationUpdatedAt || !lockedProfile.serviceAddress)) {
        availabilityError = new AppError('Set your service address and location before going online', 400);
        return null;
      }
      lockedProfile.isAvailable = isAvailable;
      await lockedProfile.save();
      return lockedProfile;
    });
    if (availabilityError) return next(availabilityError);
    if (!profile) return next(new AppError('Partner profile is busy; retry the availability change', 409));
    if (isAvailable) {
      try {
        await assignPendingBookings();
      } catch (err) {
        console.error('[PartnerAssignment] Could not retry pending bookings:', err);
      }
    }
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/partner/requests
// ---------------------------------------------------------------------------
export const getNearbyRequests = async (req, res, next) => {
  try {
    // Only verified partners may see job requests
    const profile = await PartnerProfile.findOne({ userId: req.user._id });
    if (!profile?.isVerified) {
      return next(new AppError('Your account is not yet verified by admin', 403));
    }

    const requests = await Booking.find({ status: 'partner_assigned', partnerId: req.user._id })
      .populate('customerId', 'name phone')
      .populate('vehicleId', 'make model type licensePlate')
      .populate('serviceId', 'name category price duration')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: { requests } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/partner/requests/:bookingId/accept
// ---------------------------------------------------------------------------
export const acceptRequest = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    // Only verified partners may accept jobs
    const partnerProfile = await PartnerProfile.findOne({ userId: req.user._id });
    if (!partnerProfile?.isVerified) {
      return next(new AppError('Your account is not yet verified by admin', 403));
    }

    const booking = await withPartnerAssignmentLock(req.user._id, async (lockedProfile) => {
      if (!lockedProfile.isVerified || !lockedProfile.isActive) return null;
      const current = await Booking.findOne({
        _id: bookingId,
        partnerId: req.user._id,
        status: 'partner_assigned',
      });
      if (!current) return null;

      const conflict = await Booking.exists({
        _id: { $ne: current._id },
        partnerId: req.user._id,
        status: { $in: ['confirmed', 'partner_assigned', 'partner_accepted', 'partner_on_way', 'partner_arrived', 'in_progress'] },
        startAt: { $lt: current.endAt },
        endAt: { $gt: current.startAt },
      });
      if (conflict) return null;

      const now = new Date();
      return Booking.findOneAndUpdate(
        { _id: bookingId, partnerId: req.user._id, status: 'partner_assigned' },
        {
          $set: { status: 'partner_accepted' },
          $push: {
            statusHistory: {
              status: 'partner_accepted',
              changedAt: now,
              changedBy: req.user._id,
              note: 'Partner accepted the assigned booking',
            },
          },
        },
        { new: true }
      );
    });

    if (!booking) return next(new AppError('Request is no longer available or conflicts with another job', 409));

    // Emit socket event
    try {
      const { emitToBooking } = await import('../services/socketService.js');
      emitToBooking(bookingId, 'booking:status_update', {
        bookingId,
        status: 'partner_accepted',
      });
    } catch (err) {
      console.error('[PartnerAssignment] Could not emit acceptance event:', err);
    }

    res.json({ success: true, data: { booking } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/partner/requests/:bookingId/reject
// ---------------------------------------------------------------------------
export const rejectRequest = async (req, res, next) => {
  try {
    // Only verified partners may reject/opt-out of requests (mirrors accept guard)
    const partnerProfile = await PartnerProfile.findOne({ userId: req.user._id });
    if (!partnerProfile?.isVerified) {
      return next(new AppError('Your account is not yet verified by admin', 403));
    }

    const { bookingId } = req.params;
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: 'partner_assigned', partnerId: req.user._id },
      {
        $set: { status: 'searching_partner', partnerId: null, partnerAssignedAt: null, partnerDistanceKm: null },
        $addToSet: { rejectedPartnerIds: req.user._id },
        $push: {
          statusHistory: {
            status: 'searching_partner',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: 'Partner declined the assignment',
          },
        },
      },
      { new: true }
    );
    if (!booking) return next(new AppError('This booking is no longer assigned to you', 409));

    const populated = await Booking.findById(booking._id)
      .populate('vehicleId', 'type make model')
      .populate('serviceId', 'name category vehicleTypes');
    let assignedPartner = null;
    try {
      assignedPartner = await tryAssignPartner(populated);
    } catch (err) {
      console.error('[PartnerAssignment] Could not reassign rejected booking:', err);
    }
    res.json({
      success: true,
      data: { booking: await Booking.findById(booking._id), assigned: Boolean(assignedPartner) },
    });
  } catch (err) {
    next(err);
  }
};

// Partner-side valid transitions
const PARTNER_TRANSITIONS = {
  partner_accepted: ['partner_on_way'],
  partner_on_way: ['partner_arrived'],
  partner_arrived: ['in_progress'],
  in_progress: ['completed'],
};

// ---------------------------------------------------------------------------
// PATCH /api/partner/jobs/:bookingId/status
// ---------------------------------------------------------------------------
export const updateJobStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return next(new AppError('status is required', 400));
    }

    // Read current booking first to validate the transition (no write yet)
    const current = await Booking.findOne({ _id: bookingId, partnerId: req.user._id });
    if (!current) {
      return next(new AppError('Job not found', 404));
    }

    const allowed = PARTNER_TRANSITIONS[current.status] || [];
    if (!allowed.includes(newStatus)) {
      return next(
        new AppError(
          `Cannot transition from '${current.status}' to '${newStatus}'. Valid: [${allowed.join(', ')}]`,
          400
        )
      );
    }

    const now = new Date();
    const setFields = { status: newStatus };
    if (newStatus === 'partner_arrived') setFields.partnerArrivedAt = now;
    if (newStatus === 'in_progress') setFields.serviceStartedAt = now;
    if (newStatus === 'completed') setFields.serviceCompletedAt = now;

    // Atomic write: condition on current status so a concurrent push fails
    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, partnerId: req.user._id, status: current.status },
      {
        $set: setFields,
        $push: {
          statusHistory: {
            status: newStatus,
            changedAt: now,
            changedBy: req.user._id,
            note: '',
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      return next(new AppError('Status was updated concurrently — please refresh', 409));
    }

    // On completion: update partner stats
    if (newStatus === 'completed') {
      await PartnerProfile.findOneAndUpdate(
        { userId: req.user._id },
        {
          $inc: {
            completedJobs: 1,
            totalEarnings: updated.priceAtBooking || 0,
          },
        }
      );
      assignPendingBookings().catch((err) =>
        console.error('[PartnerAssignment] Retry after completion failed:', err)
      );
    }

    // Emit socket event
    try {
      const { emitToBooking } = await import('../services/socketService.js');
      emitToBooking(bookingId, 'booking:status_update', { bookingId, status: newStatus });
    } catch {}

    res.json({ success: true, data: { booking: updated } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/partner/jobs
// ---------------------------------------------------------------------------
export const getMyJobs = async (req, res, next) => {
  try {
    const filter = { partnerId: req.user._id };
    if (req.query.status) {
      // Support comma-separated statuses
      const statuses = req.query.status.split(',').map((s) => s.trim());
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    const jobs = await Booking.find(filter)
      .populate('customerId', 'name phone email')
      .populate('vehicleId', 'make model type licensePlate color')
      .populate('serviceId', 'name category price duration')
      .sort({ startAt: -1 });

    res.json({ success: true, data: { jobs } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/partner/jobs/:bookingId
// ---------------------------------------------------------------------------
export const getJobById = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ _id: bookingId, partnerId: req.user._id })
      .populate('customerId', 'name phone email')
      .populate('vehicleId', 'make model type licensePlate color')
      .populate('serviceId', 'name category price duration');

    if (!booking) {
      return next(new AppError('Job not found', 404));
    }
    res.json({ success: true, data: { booking } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/partner/jobs/:bookingId/photos
// ---------------------------------------------------------------------------
export const uploadPhotos = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { type, urls } = req.body;

    if (!type || !['before', 'after'].includes(type)) {
      return next(new AppError("type must be 'before' or 'after'", 400));
    }
    if (!Array.isArray(urls) || urls.length === 0) {
      return next(new AppError('urls array is required', 400));
    }

    const field = type === 'before' ? 'beforePhotos' : 'afterPhotos';
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, partnerId: req.user._id },
      { $push: { [field]: { $each: urls } } },
      { new: true }
    );

    if (!booking) {
      return next(new AppError('Job not found', 404));
    }

    res.json({ success: true, data: { booking } });
  } catch (err) {
    next(err);
  }
};
