import api from './api';

// ─── Customer-facing ──────────────────────────────────────────────────────────

export async function getServices() {
  const response = await api.get('/services');
  return response.data;
}

export async function getService(id) {
  const response = await api.get('/services/' + id);
  return response.data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function createService(data) {
  const response = await api.post('/admin/services', data);
  return response.data;
}

export async function updateService(id, data) {
  const response = await api.put('/admin/services/' + id, data);
  return response.data;
}

export async function deleteService(id) {
  const response = await api.delete('/admin/services/' + id);
  return response.data;
}
