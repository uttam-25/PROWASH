import api from './axios'

/**
 * Normalise the frontend form shape → backend schema shape.
 *
 * Frontend form fields:   vehicleType, registrationNumber, make, model, color, notes
 * Backend schema fields:  type,        licensePlate,       make, model, color   (no notes)
 */
function toBackend(data) {
  const payload = {
    type: data.vehicleType || data.type,
    make: data.make,
    model: data.model,
    color: data.color || undefined,
  }
  // licensePlate = registrationNumber
  if (data.registrationNumber) payload.licensePlate = data.registrationNumber
  if (data.licensePlate) payload.licensePlate = data.licensePlate
  // year if provided
  if (data.year) payload.year = data.year

  // Lookup-enriched fields (all optional — pass through if present)
  const lookupFields = [
    'variant', 'vehicleClass', 'fuelType', 'registrationDate',
    'registrationState', 'rtoCode', 'rtoName', 'manufacturingYear',
    'emissionNorm', 'lookupProvider', 'lookupAt', 'lookupVerified',
  ]
  lookupFields.forEach(f => { if (data[f] !== undefined) payload[f] = data[f] })

  return payload
}

/**
 * Normalise the backend response shape → frontend display shape.
 *
 * Adds vehicleType and registrationNumber aliases so existing display
 * code that reads those fields continues to work.
 */
export function fromBackend(v) {
  if (!v) return v
  return {
    ...v,
    vehicleType: v.vehicleType || v.type,
    registrationNumber: v.registrationNumber || v.licensePlate,
  }
}

export const vehiclesAPI = {
  getMyVehicles: () => api.get('/vehicles/my'),
  addVehicle: (data) => api.post('/vehicles', toBackend(data)),
  // backend route is PUT /:id — not PATCH
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, toBackend(data)),
  deleteVehicle: (id) => api.delete(`/vehicles/${id}`),
  replaceVehicle: (data) => api.put('/vehicles/replace', toBackend(data)),
  // Registration number lookup — backend proxies to external provider
  lookupByReg: (registrationNumber) =>
    api.post('/vehicles/lookup', { registrationNumber }),
}
