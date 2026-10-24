/**
 * partnerAssignmentService.js
 *
 * After a booking is created, automatically find and assign the nearest
 * available verified partner within 2 km who supports the required service.
 *
 * Uses Haversine formula for distance (no external library needed).
 */
import PartnerProfile from '../models/PartnerProfile.js';
import Booking from '../models/Booking.js';

// Haversine formula — returns distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Try to assign the booking to the nearest available partner within maxKm.
 * Returns the assigned PartnerProfile (with populated userId) or null if none available.
 */
export async function tryAssignPartner(booking, maxKm = 2) {
  const { customerLocation, startAt, endAt } = booking;

  // Need customer coordinates to do geo matching
  if (!customerLocation?.lat || !customerLocation?.lng) {
    return null;
  }

  const customerLat = customerLocation.lat;
  const customerLng = customerLocation.lng;

  // Load all online, verified, active partners that have set a location
  const candidates = await PartnerProfile.find({
    isAvailable: true,
    isVerified: true,
    isActive: true,
  }).populate('userId', 'name phone email');

  if (!candidates.length) return null;

  // Determine vehicle type for service category matching
  const vehicleType = booking.vehicleId?.type || null;

  // Filter by distance and service category, sorted nearest first
  const eligible = candidates
    .filter(partner => {
      const [pLng, pLat] = partner.currentLocation.coordinates;
      // Skip partners who have not set a real location (default [0,0])
      if (pLat === 0 && pLng === 0) return false;
      return true;
    })
    .map(partner => {
      const [pLng, pLat] = partner.currentLocation.coordinates;
      const distKm = haversineKm(customerLat, customerLng, pLat, pLng);
      return { partner, distKm };
    })
    .filter(({ partner, distKm }) => {
      if (distKm > maxKm) return false;
      // Check service category match if partner has categories set
      if (partner.serviceCategories?.length > 0 && vehicleType) {
        if (!partner.serviceCategories.includes(vehicleType)) return false;
      }
      return true;
    })
    .sort((a, b) => a.distKm - b.distKm);

  if (!eligible.length) return null;

  // Try each partner in order (nearest first)
  for (const { partner, distKm } of eligible) {
    // Check if partner has a conflicting active booking at this time
    const conflict = await Booking.countDocuments({
      partnerId: partner.userId._id,
      status: { $in: ['partner_assigned', 'partner_on_way', 'partner_arrived', 'in_progress'] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });

    if (conflict > 0) continue;

    // Atomic assignment — prevents race condition between concurrent booking requests
    const assigned = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        status: { $in: ['pending', 'searching_partner'] },
        partnerId: null,
      },
      {
        $set: {
          partnerId: partner.userId._id,
          status: 'partner_assigned',
          partnerAssignedAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: 'partner_assigned',
            changedAt: new Date(),
            changedBy: partner.userId._id,
            note: `Auto-assigned to nearest partner (${distKm.toFixed(2)}km away)`,
          },
        },
      },
      { new: true }
    );

    if (assigned) {
      // Attach distKm for the caller to use in notifications
      partner._distKm = distKm;
      return partner;
    }
  }

  return null;
}
