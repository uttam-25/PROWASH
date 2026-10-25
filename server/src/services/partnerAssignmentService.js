import { randomUUID } from 'crypto';
import Booking from '../models/Booking.js';
import PartnerProfile from '../models/PartnerProfile.js';

const MAX_ASSIGNMENT_DISTANCE_KM = 2;
const ACTIVE_BOOKING_STATUSES = [
  'confirmed',
  'partner_assigned',
  'partner_accepted',
  'partner_on_way',
  'partner_arrived',
  'in_progress',
];
const ASSIGNABLE_BOOKING_STATUSES = ['pending', 'searching_partner'];

export function haversineKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function withPartnerAssignmentLock(userId, callback) {
  const now = new Date();
  const lockId = randomUUID();
  const profile = await PartnerProfile.findOneAndUpdate(
    {
      userId,
      $or: [
        { assignmentLockUntil: { $exists: false } },
        { assignmentLockUntil: null },
        { assignmentLockUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        assignmentLockId: lockId,
        assignmentLockUntil: new Date(now.getTime() + 30000),
      },
    },
    { new: true }
  ).populate('userId', 'name phone email');

  if (!profile) return null;

  try {
    return await callback(profile);
  } finally {
    await PartnerProfile.updateOne(
      { _id: profile._id, assignmentLockId: lockId },
      { $unset: { assignmentLockId: 1, assignmentLockUntil: 1 } }
    );
  }
}

async function emitAssignment(booking, partner) {
  try {
    const { emitToBooking, emitToPartner } = await import('./socketService.js');
    const bookingId = booking._id.toString();
    emitToBooking(bookingId, 'booking:assigned', {
      bookingId,
      partnerName: partner.userId?.name,
      status: 'partner_assigned',
    });
    if (partner.userId?._id) {
      emitToPartner(partner.userId._id.toString(), 'job:assigned', { bookingId });
    }
  } catch (err) {
    console.error('[PartnerAssignment] Could not emit assignment event:', err);
  }
}

function hasCoordinates(location) {
  return Number.isFinite(location?.lat) && location.lat >= -90 && location.lat <= 90 &&
    Number.isFinite(location?.lng) && location.lng >= -180 && location.lng <= 180;
}

function isCompatible(profile, vehicleType, serviceId) {
  if (profile.serviceCategories.length && !profile.serviceCategories.includes(vehicleType)) return false;
  return !profile.supportedServiceIds.length ||
    profile.supportedServiceIds.some((id) => id.toString() === serviceId.toString());
}

function getPartnerCoordinates(profile) {
  const [lng, lat] = profile.currentLocation?.coordinates || [];
  const locationIsSet =
    profile.locationUpdatedAt ||
    (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0));
  if (
    !locationIsSet ||
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180
  ) return null;
  return { lat, lng };
}

async function hasTimeConflict(partnerId, booking) {
  return Booking.exists({
    partnerId,
    _id: { $ne: booking._id },
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startAt: { $lt: booking.endAt },
    endAt: { $gt: booking.startAt },
  });
}

export async function tryAssignPartner(booking) {
  const { customerLocation, startAt, endAt } = booking;
  if (!hasCoordinates(customerLocation) || !startAt || !endAt) return null;

  const vehicleType = booking.vehicleId?.type;
  const serviceId = booking.serviceId?._id || booking.serviceId;
  if (!vehicleType || !serviceId) return null;

  const rejectedIds = (booking.rejectedPartnerIds || []).map((id) => id.toString());
  const profiles = await PartnerProfile.find({
    isAvailable: true,
    isVerified: true,
    isActive: true,
  }).populate('userId', 'name phone email');

  const candidates = profiles
    .filter((profile) => {
      if (!profile.userId || rejectedIds.includes(profile.userId._id.toString())) return false;
      return Boolean(getPartnerCoordinates(profile));
    })
    .map((profile) => {
      const { lat, lng } = getPartnerCoordinates(profile);
      return {
        profile,
        distanceKm: haversineKm(customerLocation.lat, customerLocation.lng, lat, lng),
      };
    })
    .filter(({ distanceKm, profile }) => distanceKm <= MAX_ASSIGNMENT_DISTANCE_KM &&
      isCompatible(profile, vehicleType, serviceId))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  for (const { profile: candidate } of candidates) {
    const assignment = await withPartnerAssignmentLock(candidate.userId._id, async (lockedProfile) => {
      if (!lockedProfile.isAvailable || !lockedProfile.isVerified || !lockedProfile.isActive) return null;
      if (!hasCoordinates(customerLocation) || !isCompatible(lockedProfile, vehicleType, serviceId)) return null;
      const coordinates = getPartnerCoordinates(lockedProfile);
      if (!coordinates) return null;
      const distanceKm = haversineKm(customerLocation.lat, customerLocation.lng, coordinates.lat, coordinates.lng);
      if (distanceKm > MAX_ASSIGNMENT_DISTANCE_KM) return null;
      if (await hasTimeConflict(lockedProfile.userId._id, booking)) return null;

      const assigned = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          status: { $in: ASSIGNABLE_BOOKING_STATUSES },
          partnerId: null,
        },
        {
          $set: {
            partnerId: lockedProfile.userId._id,
            status: 'partner_assigned',
            partnerAssignedAt: new Date(),
            partnerDistanceKm: distanceKm,
          },
          $push: {
            statusHistory: {
              status: 'partner_assigned',
              changedAt: new Date(),
              changedBy: lockedProfile.userId._id,
              note: `Assigned to nearest eligible partner (${distanceKm.toFixed(2)} km away)`,
            },
          },
        },
        { new: true }
      );

      return assigned ? { assigned, profile: lockedProfile, distanceKm } : null;
    });

    if (!assignment) continue;
    assignment.profile._distKm = assignment.distanceKm;
    await emitAssignment(assignment.assigned, assignment.profile);
    return assignment.profile;
  }

  return null;
}

export async function assignPendingBookings() {
  while (true) {
    const pending = await Booking.find({
      status: { $in: ASSIGNABLE_BOOKING_STATUSES },
      partnerId: null,
      'customerLocation.lat': { $type: 'number' },
      'customerLocation.lng': { $type: 'number' },
    })
      .populate('vehicleId', 'type make model')
      .populate('serviceId', 'name category vehicleTypes')
      .sort({ startAt: 1 })
      .limit(100);
    if (!pending.length) return;

    let assignedCount = 0;
    for (const booking of pending) {
      if (await tryAssignPartner(booking)) assignedCount += 1;
    }
    if (!assignedCount || pending.length < 100) return;
  }
}
