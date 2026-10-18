import api from './api';

export async function getNotifications(unreadOnly = false) {
  const params = unreadOnly ? { read: 'false' } : {};
  const response = await api.get('/notifications', { params });
  return response.data;
}

// Backwards-compat alias — existing callers use getMyNotifications()
export async function getMyNotifications() {
  return getNotifications(false);
}

export async function markRead(id) {
  const response = await api.patch('/notifications/' + id + '/read');
  return response.data;
}

export async function markAllRead() {
  const response = await api.patch('/notifications/read-all');
  return response.data;
}
