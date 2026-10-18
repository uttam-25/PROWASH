import api from './api';

export async function getMyNotifications() {
  const response = await api.get('/notifications');
  return response.data;
}

export async function markRead(id) {
  const response = await api.put('/notifications/' + id + '/read');
  return response.data;
}

export async function markAllRead() {
  const response = await api.put('/notifications/read-all');
  return response.data;
}
