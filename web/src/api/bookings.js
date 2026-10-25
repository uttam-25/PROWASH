import api from './axios'
export const bookingsAPI = {
  createBooking: (data, requestId) => api.post('/bookings', data, {
    headers: requestId ? { 'Idempotency-Key': requestId } : {},
  }),
  reverseGeocode: (coordinates) => api.post('/bookings/location/reverse-geocode', coordinates),
  getMyBookings: (params = {}) => api.get('/bookings/my', { params }),
  getBooking: (id) => api.get(`/bookings/${id}`),
  // reason is optional — server accepts empty string
  cancelBooking: (id, reason = '') => api.patch(`/bookings/${id}/cancel`, { reason }),
  rescheduleBooking: (id, startAt) => api.patch(`/bookings/${id}/reschedule`, { newStartAt: startAt }),
}
