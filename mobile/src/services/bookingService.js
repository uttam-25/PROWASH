import api from './api';

// ─── Unified service object ──────────────────────────────────────────────────

export const bookingService = {
  getAvailableSlots: (serviceId, date) =>
    api.get(`/availability?serviceId=${serviceId}&date=${date}`).then((r) => r.data),

  createBooking: (data, requestId) =>
    api.post('/bookings', data, {
      headers: requestId ? { 'Idempotency-Key': requestId } : {},
    }).then((r) => r.data),

  getMyBookings: (params = {}) =>
    api.get('/bookings/my', { params }).then((r) => r.data),

  getBookingById: (id) => api.get(`/bookings/${id}`).then((r) => r.data),

  cancelBooking: (id, reason) =>
    api.patch(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),

  rescheduleBooking: (id, newStartAt) =>
    api.patch(`/bookings/${id}/reschedule`, { newStartAt }).then((r) => r.data),

  getAdminBookings: (params) =>
    api.get('/admin/bookings', { params }).then((r) => r.data),

  updateBookingStatus: (id, status) =>
    api.patch(`/admin/bookings/${id}/status`, { status }).then((r) => r.data),
};

// ─── Named function exports (backward compat) ────────────────────────────────

export async function createBooking(data) {
  return bookingService.createBooking(data);
}

export async function getMyBookings(params) {
  return bookingService.getMyBookings(params);
}

// Old name alias used by BookingDetailsScreen
export async function getBooking(id) {
  return bookingService.getBookingById(id);
}

export async function getBookingById(id) {
  return bookingService.getBookingById(id);
}

export async function cancelBooking(id, reason) {
  return bookingService.cancelBooking(id, reason);
}

export async function rescheduleBooking(id, newStartAt) {
  return bookingService.rescheduleBooking(id, newStartAt);
}

export async function getAvailability(date) {
  const response = await api.get('/availability?date=' + date);
  return response.data;
}

export async function getAdminBookings(params) {
  return bookingService.getAdminBookings(params);
}

export async function updateBookingStatus(id, status) {
  return bookingService.updateBookingStatus(id, status);
}
