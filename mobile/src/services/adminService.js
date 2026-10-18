import api from './api';

const adminService = {
  getDashboard() {
    return api.get('/admin/dashboard').then((r) => r.data);
  },

  getReports() {
    return api.get('/admin/reports').then((r) => r.data);
  },

  getBookings(params) {
    return api.get('/admin/bookings', { params }).then((r) => r.data);
  },

  getBookingDetails(id) {
    return api.get(`/admin/bookings/${id}`).then((r) => r.data);
  },

  updateBookingStatus(id, status, note) {
    return api.patch(`/admin/bookings/${id}/status`, { status, note }).then((r) => r.data);
  },

  getServices(params) {
    return api.get('/services', { params }).then((r) => r.data);
  },

  createService(data) {
    return api.post('/admin/services', data).then((r) => r.data);
  },

  updateService(id, data) {
    return api.put(`/admin/services/${id}`, data).then((r) => r.data);
  },

  deleteService(id) {
    return api.delete(`/admin/services/${id}`).then((r) => r.data);
  },

  getCustomers(params) {
    return api.get('/admin/customers', { params }).then((r) => r.data);
  },

  getCustomerDetails(id) {
    return api.get(`/admin/customers/${id}`).then((r) => r.data);
  },

  getVehicles(params) {
    return api.get('/admin/vehicles', { params }).then((r) => r.data);
  },

  getPayments(params) {
    return api.get('/admin/payments', { params }).then((r) => r.data);
  },

  recordCODCollection(paymentId) {
    return api.patch(`/admin/payments/${paymentId}/collect`).then((r) => r.data);
  },

  getSchedule() {
    return api.get('/admin/schedule').then((r) => r.data);
  },

  updateSchedule(data) {
    return api.put('/admin/schedule', data).then((r) => r.data);
  },

  addBlockedPeriod(data) {
    return api.post('/admin/schedule/block', data).then((r) => r.data);
  },

  removeBlockedPeriod(periodId) {
    return api.delete(`/admin/schedule/block/${periodId}`).then((r) => r.data);
  },

  addHoliday(data) {
    return api.post('/admin/schedule/holiday', data).then((r) => r.data);
  },

  removeHoliday(holidayId) {
    return api.delete(`/admin/schedule/holiday/${holidayId}`).then((r) => r.data);
  },
};

export default adminService;
