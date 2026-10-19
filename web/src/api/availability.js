import api from './axios'
export const availabilityAPI = {
  getSlots: (serviceId, date) => api.get('/availability', { params: { serviceId, date } }),
}
