import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PartnerProfile from '../models/PartnerProfile.js';
import Booking from '../models/Booking.js';
import { AppError } from '../middleware/errorHandler.js';

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
    const { name, email, password, phone, serviceCategories } = req.body;

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
    const profile = await PartnerProfile.findOne({ userId: req.user._id });
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
    const allowed = ['phone', 'vehicleOwned', 'serviceCategories', 'serviceRadius', 'bankDetails'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const profile = await PartnerProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
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
// PATCH /api/partner/location
// ---------------------------------------------------------------------------
export const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return next(new AppError('lat and lng are required', 400));
    }
    const profile = await PartnerProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { 'currentLocation.coordinates': [parseFloat(lng), parseFloat(lat)] } },
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
// PATCH /api/partner/availability
// ---------------------------------------------------------------------------
export const toggleAvailability = async (req, res, next) => {
  try {
    const profile = await PartnerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return next(new AppError('Partner profile not found', 404));
    }
    profile.isAvailable = !profile.isAvailable;
    await profile.save();
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

    const requests = await Booking.find({
      status: { $in: ['searching_partner', 'pending'] },
      partnerId: null,
    })
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

    // Atomic findOneAndUpdate to prevent double-accepts
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: { $in: ['searching_partner', 'pending'] }, partnerId: null },
      {
        $set: {
          partnerId: req.user._id,
          status: 'partner_assigned',
          partnerAssignedAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: 'partner_assigned',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: 'Partner accepted the request',
          },
        },
      },
      { new: true }
    );

    if (!booking) {
      return next(new AppError('Request no longer available or already assigned', 409));
    }

    // Emit socket event
    try {
      const { emitToBooking } = await import('../services/socketService.js');
      emitToBooking(bookingId, 'booking:assigned', {
        bookingId,
        partnerId: req.user._id,
        partnerName: req.user.name,
        status: 'partner_assigned',
      });
    } catch {}

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

    // No status change — partner just opts out; log it in statusHistory.
    const { bookingId } = req.params;
    // Only log for unassigned requests still awaiting a partner.
    await Booking.updateOne(
      { _id: bookingId, status: { $in: ['searching_partner', 'pending'] }, partnerId: null },
      {
        $push: {
          statusHistory: {
            status: 'searching_partner',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: `Rejected by partner ${req.user._id}`,
          },
        },
      }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Partner-side valid transitions
const PARTNER_TRANSITIONS = {
  partner_assigned: ['partner_on_way'],
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
