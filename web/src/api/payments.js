import api from './axios'
export const paymentsAPI = {
  createOrder: (bookingId) => api.post('/payments/create-order', { bookingId }),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getMyPayments: () => api.get('/payments/my'),
  confirmUPI: (bookingId, upiRef = '') => api.post('/payments/confirm-upi', { bookingId, upiRef }),
}
