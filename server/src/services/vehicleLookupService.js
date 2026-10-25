/**
 * vehicleLookupService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Provider adapter for Indian vehicle registration lookup.
 *
 * Supported providers (configured via env vars):
 *   VEHICLE_LOOKUP_PROVIDER = "rapidsapi" | "vehicleinfo" | "none" (default)
 *   VEHICLE_LOOKUP_API_KEY  = <your API key>
 *   VEHICLE_LOOKUP_API_URL  = <override base URL, optional>
 *
 * When no credentials are configured the service returns a structured
 * "not_configured" response so the rest of the app degrades gracefully to
 * manual entry — it never throws or invents data.
 *
 * Provider: RapidAPI / "India Vehicle Registration Info" is the reference
 * integration (https://rapidapi.com/coredata/api/india-vehicle-registration-info).
 * Any provider that returns compatible fields can be wired in by adding a
 * new adapter case below.
 */

import { AppError } from '../middleware/errorHandler.js';

// ─── Indian registration number regex ────────────────────────────────────────
// Standard: 2 letters + 2 digits + 1-3 letters + 4 digits   e.g. MH12AB1234
// BH series: 2 digits + BH + 4 digits + 2 letters            e.g. 22BH1234AB
const REG_PATTERNS = [
  /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/,   // standard
  /^\d{2}BH\d{4}[A-Z]{2}$/,              // BH series
];

export function normaliseRegNumber(raw) {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function validateRegNumber(normalised) {
  return REG_PATTERNS.some((p) => p.test(normalised));
}

// ─── Category mapper ─────────────────────────────────────────────────────────
const CATEGORY_MAP = {
  // Passenger cars
  'lmv': 'Car', 'lmv-car': 'Car', 'motor car': 'Car',
  'private car': 'Car', 'maxi cab': 'Car',
  // Bikes / motorcycles
  'm/cycle': 'Bike', 'motorcycle': 'Bike', 'mcwg': 'Bike',
  'm/cycle with gear': 'Bike', 'motor cycle': 'Bike',
  // Scooties / scooters
  'scooter': 'Scooty', 'scooty': 'Scooty', 'm/cycle/scooter': 'Scooty',
  'moped': 'Scooty', 'motor cycle w/o gear': 'Scooty',
};

export function mapCategory(rawCategory) {
  if (!rawCategory) return null;
  const key = rawCategory.toLowerCase().trim();
  return CATEGORY_MAP[key] || null;
}

// ─── Provider: none / not configured ─────────────────────────────────────────
function notConfiguredResponse(regNumber) {
  return {
    status: 'not_configured',
    regNumber,
    message:
      'Vehicle lookup is not configured. Set VEHICLE_LOOKUP_PROVIDER and ' +
      'VEHICLE_LOOKUP_API_KEY in server/.env to enable automatic lookup.',
    vehicle: null,
  };
}

// ─── Provider: RapidAPI — India Vehicle Registration Info ─────────────────────
// Endpoint: POST https://india-vehicle-registration-info.p.rapidapi.com/api
// Headers:  x-rapidapi-key, x-rapidapi-host
async function lookupViaRapidAPI(regNumber, apiKey, baseUrl) {
  const url =
    baseUrl || 'https://india-vehicle-registration-info.p.rapidapi.com/api';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 s

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'india-vehicle-registration-info.p.rapidapi.com',
      },
      body: JSON.stringify({ reg_no: regNumber }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 429) {
    throw new AppError('Vehicle lookup rate limit reached. Please try again later.', 429);
  }
  if (!res.ok) {
    throw new AppError(`Vehicle lookup provider error (HTTP ${res.status}).`, 502);
  }

  const json = await res.json();

  // Provider returns { success: true/false, response: { ... } }
  if (!json || json.success === false || !json.response) {
    return {
      status: 'not_found',
      regNumber,
      message:
        'No vehicle details found for this registration number. ' +
        'Please enter vehicle details manually.',
      vehicle: null,
    };
  }

  const r = json.response;

  // Map to our normalised shape
  const rawCategory = r.vehicle_class_desc || r.vehicle_class || '';
  const prowashCategory = mapCategory(rawCategory);

  const vehicle = {
    regNumber,
    maker: r.maker_desc || r.owner_name_mask || null,      // manufacturer
    model: r.model_desc || null,
    variant: r.variant_desc || null,
    vehicleClass: rawCategory || null,
    prowashCategory,                                        // Car / Bike / Scooty / null
    fuelType: r.fuel_desc || r.fuel_type || null,
    color: r.color || r.colour || null,
    registrationDate: r.reg_date || r.registration_date || null,
    registrationState: r.reg_state_cd || r.state || null,
    rtoCode: r.rto_code || r.reg_authority || null,
    rtoName: r.rto_name || null,
    manufacturingYear: r.manufacturing_yr || r.mfg_month_yr || null,
    emissionNorm: r.norm_desc || null,
    vehicleStatus: r.vch_status_as_on ? r.vch_status_as_on : null,
    // Never include owner personal details (name, address, mobile)
  };

  return {
    status: 'found',
    regNumber,
    vehicle,
  };
}

// ─── Public entrypoint ────────────────────────────────────────────────────────
export async function lookupVehicle(regNumber) {
  const provider = (process.env.VEHICLE_LOOKUP_PROVIDER || 'none').toLowerCase();
  const apiKey = process.env.VEHICLE_LOOKUP_API_KEY || '';
  const baseUrl = process.env.VEHICLE_LOOKUP_API_URL || '';

  if (provider === 'none' || !apiKey) {
    return notConfiguredResponse(regNumber);
  }

  if (provider === 'rapidapi' || provider === 'rapidsapi') {
    return lookupViaRapidAPI(regNumber, apiKey, baseUrl);
  }

  // Unknown provider configured — fail informatively
  throw new AppError(
    `Unknown VEHICLE_LOOKUP_PROVIDER "${provider}". Supported: rapidapi.`,
    500
  );
}
