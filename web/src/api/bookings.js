import api from './axios'
export const bookingsAPI = {
  createBooking: (data) => api.post('/bookings', data),
  getMyBookings: (params = {}) => api.get('/bookings/my', { params }),
  getBooking: (id) => api.get(`/bookings/${id}`),
  cancelBooking: (id) => api.patch(`/bookings/${id}/cancel`),
  rescheduleBooking: (id, startAt) => api.patch(`/bookings/${id}/reschedule`, { startAt }),
}
