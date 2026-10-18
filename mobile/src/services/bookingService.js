import api from './api';

// ─── Customer-facing ──────────────────────────────────────────────────────────

export async function createBooking(data) {
  const response = await api.post('/bookings', data);
  return response.data;
}

export async function getMyBookings() {
  const response = await api.get('/bookings/my');
  return response.data;
}

export async function getBooking(id) {
  const response = await api.get('/bookings/' + id);
  return response.data;
}

export async function cancelBooking(id, reason) {
  const response = await api.put('/bookings/' + id + '/cancel', {
    cancelReason: reason,
  });
  return response.data;
}

export async function getAvailability(date) {
  const response = await api.get('/availability?date=' + date);
  return response.data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminBookings(params) {
  const response = await api.get('/admin/bookings', { params });
  return response.data;
}

export async function updateBookingStatus(id, status) {
  const response = await api.put('/admin/bookings/' + id + '/status', {
    status,
  });
  return response.data;
}
