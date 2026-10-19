import api from './axios'
export const servicesAPI = {
  getServices: (params = {}) => api.get('/services', { params }),
  getService: (id) => api.get(`/services/${id}`),
}
