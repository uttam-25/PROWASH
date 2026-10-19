import api from './axios'

export const partnerAPI = {
  register:           (data)               => api.post('/partner/register', data),
  getProfile:         ()                   => api.get('/partner/profile'),
  updateProfile:      (data)               => api.patch('/partner/profile', data),
  updateLocation:     (data)               => api.patch('/partner/location', data),
  toggleAvailability: ()                   => api.patch('/partner/availability'),
  getNearbyRequests:  ()                   => api.get('/partner/requests'),
  acceptRequest:      (bookingId)          => api.patch(`/partner/requests/${bookingId}/accept`),
  rejectRequest:      (bookingId)          => api.patch(`/partner/requests/${bookingId}/reject`),
  getJobs:            (params = {})        => api.get('/partner/jobs', { params }),
  getJobById:         (bookingId)          => api.get(`/partner/jobs/${bookingId}`),
  updateJobStatus:    (bookingId, status)  => api.patch(`/partner/jobs/${bookingId}/status`, { status }),
  uploadPhotos:       (bookingId, data)    => api.post(`/partner/jobs/${bookingId}/photos`, data),
}
