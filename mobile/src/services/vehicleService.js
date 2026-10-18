import api from './api';

export async function getMyVehicles() {
  const response = await api.get('/vehicles/my');
  return response.data;
}

export async function addVehicle(data) {
  const response = await api.post('/vehicles', data);
  return response.data;
}

export async function getVehicle(id) {
  const response = await api.get('/vehicles/' + id);
  return response.data;
}

export async function updateVehicle(id, data) {
  const response = await api.put('/vehicles/' + id, data);
  return response.data;
}

export async function deleteVehicle(id) {
  const response = await api.delete('/vehicles/' + id);
  return response.data;
}
