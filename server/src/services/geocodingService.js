const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
let lastRequestAt = 0;
let requestQueue = Promise.resolve();

function getRequestHeaders() {
  return {
    'User-Agent': process.env.GEOCODING_USER_AGENT || 'PROWASH/1.0',
    Accept: 'application/json',
  };
}

function addEmailParameter(url) {
  if (process.env.GEOCODING_EMAIL) {
    url.searchParams.set('email', process.env.GEOCODING_EMAIL);
  }
  return url;
}

function normalizeAddress(address = {}) {
  return {
    houseNumber: address.house_number || '',
    street: address.road || address.pedestrian || address.footway || '',
    area: address.suburb || address.neighbourhood || address.city_district || address.village || '',
    city: address.city || address.town || address.village || municipality(address) || '',
    state: address.state || '',
    pinCode: address.postcode || '',
    landmark: address.amenity || address.building || '',
  };
}

function municipality(address) {
  return address.county || address.district || '';
}

async function fetchJson(url) {
  const queuedRequest = requestQueue.then(async () => {
    const waitMs = Math.max(0, 1000 - (Date.now() - lastRequestAt));
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestAt = Date.now();
  });
  requestQueue = queuedRequest.catch(() => {});
  await queuedRequest;

  const response = await fetch(url, {
    headers: getRequestHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Geocoding provider returned HTTP ${response.status}`);
  }
  return response.json();
}

export async function geocodeAddress(address) {
  const url = addEmailParameter(new URL(`${NOMINATIM_URL}/search`));
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'in');

  const results = await fetchJson(url);
  const result = results[0];
  if (!result) return null;

  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    address: normalizeAddress(result.address),
    displayName: result.display_name || '',
  };
}

export async function reverseGeocodeCoordinates(lat, lng) {
  const url = addEmailParameter(new URL(`${NOMINATIM_URL}/reverse`));
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');

  const result = await fetchJson(url);
  if (!result?.address) return null;
  return {
    address: normalizeAddress(result.address),
    displayName: result.display_name || '',
  };
}
