import api from './api';

// ─── Customer-facing ──────────────────────────────────────────────────────────

export async function getMyPayments() {
  const response = await api.get('/payments/my');
  return response.data;
}

export async function getPayment(id) {
  const response = await api.get('/payments/' + id);
  return response.data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminPayments(params) {
  const response = await api.get('/admin/payments', { params });
  return response.data;
}

export async function updatePaymentStatus(id, status) {
  const response = await api.put('/admin/payments/' + id + '/status', {
    status,
  });
  return response.data;
}
