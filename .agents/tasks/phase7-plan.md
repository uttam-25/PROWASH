# PROWASH Phase 7 — Implementation Plan

**Codebase baseline summary (read before implementing):**
- Server: ESM (`"type":"module"`), Express + Mongoose, `AppError` from `server/src/middleware/errorHandler.js`
- Axios interceptor in `web/src/api/axios.js` converts every error to `new Error(message)`, so all catch blocks must use `err.message`, never `err.response?.data?.message`
- Existing Booking status enum: `['pending','confirmed','in_progress','completed','cancelled','rejected','rescheduled']` — must be expanded without breaking existing values
- `server/src/models/Service.js` uses field `duration` (not `durationMinutes`); web pages display `s.durationMinutes` but the DB field is `duration`
- `server/scripts/seedServices.js` exports `seedServicesData()` so the dev-seed API route can call it — preserve this export
- `AdminLayout` NAV_ITEMS array is in `web/src/components/layout/AdminLayout.jsx`
- `ProtectedRoute` in `web/src/App.jsx` currently handles only `role='customer'` and `role='admin'`
- `server/src/server.js` uses `app.listen` directly — must change to `http.createServer` for Socket.IO

---

## STEP 1 — Fix `err.response?.data?.message` bugs across web pages

**Files to read first:**
- `web/src/api/axios.js` — confirms interceptor normalises errors to plain `Error` objects (already confirmed: `Promise.reject(new Error(...))`)

**What to do:**
Replace every occurrence of `err.response?.data?.message ||` with nothing (just use `err.message`) in all customer and admin pages. Also fix the `vRes.data.data.vehicles` access in `DashboardPage` to be safe.

**Files to modify:**

1. `web/src/pages/customer/DashboardPage.jsx`
   - Line with `setError(err.response?.data?.message || ...)` → `setError(err.message || 'Failed to load dashboard data.')`
   - Line `setVehicles(vRes.data.data.vehicles || [])` → `setVehicles(vRes.data.data?.vehicles || vRes.data.data || [])`

2. `web/src/pages/customer/MyBookingsPage.jsx`
   - Two occurrences of `err.response?.data?.message` → `err.message` (in `fetchBookings` catch and `handleCancel` toast.error)

3. `web/src/pages/customer/BookingDetailPage.jsx`
   - Four occurrences: `fetchBooking` catch, `handleCancel` toast.error, `handleReschedule` toast.error → `err.message`

4. `web/src/pages/customer/ServicesPage.jsx`
   - One occurrence in `fetchServices` catch → `err.message`

5. `web/src/pages/admin/AdminDashboardPage.jsx`
   - One occurrence in `fetchData` catch → `err.message`

**Gotchas:**
- Do NOT change `err.message` calls that are already correct (e.g., `BookingWizard.jsx` already uses `err.message`)
- Do a grep across `web/src/pages/**/*.jsx` for `err.response?.data?.message` to catch any additional pages missed above

**Verify:** `cd web && npm run build` — must complete with zero errors.

---

## STEP 2 — Backend: Partner model, Review model, User role, Booking fields

**Files to read first:**
- `server/src/models/User.js` — role enum currently `['customer','admin']`
- `server/src/models/Booking.js` — existing fields and status enum
- `server/src/models/Service.js` — for field name reference

**What to do:**

### 2a. Update `server/src/models/User.js`
Add `'partner'` to the role enum: `['customer', 'admin', 'partner']`. No other changes.

**File to modify:** `server/src/models/User.js`

### 2b. Create `server/src/models/PartnerProfile.js`
```js
import mongoose from 'mongoose';

const partnerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    phone: { type: String, required: true },
    aadhaarNumber: { type: String, select: false },
    vehicleOwned: { type: String },
    serviceCategories: { type: [String], default: [] }, // ['Car','Bike','Scooty']
    serviceRadius: { type: Number, default: 10 },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    isAvailable: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    totalEarnings: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    documents: [{ type: { type: String }, url: String, verified: { type: Boolean, default: false } }],
    bankDetails: {
      accountNumber: { type: String, select: false },
      ifsc: String,
      accountName: String,
    },
  },
  { timestamps: true }
);

partnerProfileSchema.index({ currentLocation: '2dsphere' });

const PartnerProfile = mongoose.model('PartnerProfile', partnerProfileSchema);
export default PartnerProfile;
```

**File to create:** `server/src/models/PartnerProfile.js`

### 2c. Create `server/src/models/Review.js`
```js
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',  required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    partnerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    comment:    { type: String, trim: true },
  },
  { timestamps: true }
);

const Review = mongoose.model('Review', reviewSchema);
export default Review;
```

**File to create:** `server/src/models/Review.js`

### 2d. Update `server/src/models/Booking.js`
ADD the following fields to `bookingSchema` WITHOUT removing any existing fields or status values:
```js
partnerId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
partnerAssignedAt:  { type: Date },
partnerArrivedAt:   { type: Date },
serviceStartedAt:   { type: Date },
serviceCompletedAt: { type: Date },
customerLocation: {
  address: { type: String },
  lat:     { type: Number },
  lng:     { type: Number },
},
beforePhotos: { type: [String], default: [] },
afterPhotos:  { type: [String], default: [] },
isImmediate:  { type: Boolean, default: false },
```

Expand the `status` enum to include new states while preserving existing ones:
```js
enum: ['pending','searching_partner','partner_assigned','partner_on_way','partner_arrived','in_progress','completed','cancelled','rejected','rescheduled']
```

**Gotchas:**
- The existing `ALLOWED_TRANSITIONS` map in `adminController.js` references old status values. After adding new statuses to the enum, add entries in that map for the new values too: `searching_partner: ['partner_assigned','cancelled']`, `partner_assigned: ['partner_on_way','cancelled']`, `partner_on_way: ['partner_arrived','cancelled']`, `partner_arrived: ['in_progress','cancelled']`. Do this in **Step 3** when editing `adminController.js`.
- `'confirmed'` was removed from the step task description enum, but it exists in the database and in `ALLOWED_TRANSITIONS`. Keep `'confirmed'` in the enum to avoid breaking existing records.

**File to modify:** `server/src/models/Booking.js`

**Verify:** `cd server && node --input-type=module <<< "import './src/models/Booking.js'"` — no syntax errors. Or just proceed to Step 3 and verify via server start.

---

## STEP 3 — Backend: Partner controller, routes, requirePartner middleware

**Files to read first:**
- `server/src/middleware/auth.js` — to add `requirePartner` following `requireAdmin` pattern
- `server/src/routes/adminRoutes.js` — route structure pattern
- `server/src/controllers/adminController.js` — `ALLOWED_TRANSITIONS` map to update

### 3a. Add `requirePartner` to `server/src/middleware/auth.js`
```js
export const requirePartner = (req, res, next) => {
  if (!req.user || req.user.role !== 'partner') {
    return next(new AppError('Access denied — partners only', 403));
  }
  next();
};
```

**File to modify:** `server/src/middleware/auth.js`

### 3b. Create `server/src/controllers/partnerController.js`
Implement these handlers (all use `AppError` from `../middleware/errorHandler.js`):

- **registerPartner** `POST /api/partner/register` — Create `User` with `role:'partner'`, create `PartnerProfile` with `userId`, generate JWT using same pattern as `authController`. Return `{ success:true, token, user }`.
- **getPartnerProfile** `GET /api/partner/profile` — Find `PartnerProfile` by `userId: req.user._id`, populate `userId` with `name email phone`. Return `{ success:true, data: profile }`.
- **updatePartnerProfile** `PATCH /api/partner/profile` — `findOneAndUpdate` on `PartnerProfile` with allowed fields: `phone, vehicleOwned, serviceCategories, serviceRadius, bankDetails`. Return updated profile.
- **updateLocation** `PATCH /api/partner/location` — Expect `{ lng, lat }` in body. Update `currentLocation.coordinates` to `[lng, lat]`.
- **toggleAvailability** `PATCH /api/partner/availability` — Toggle `isAvailable` using `$set`. Return updated profile.
- **getNearbyRequests** `GET /api/partner/requests` — Find `Booking` where `status:'searching_partner'` and `partnerId` does not exist (`{$exists:false}` or `null`). Populate `customerId vehicleId serviceId`. Return list.
- **acceptRequest** `PATCH /api/partner/requests/:bookingId/accept` — Atomic: `Booking.findOneAndUpdate({ _id: bookingId, status:'searching_partner', partnerId: null }, { $set: { partnerId: req.user._id, status:'partner_assigned', partnerAssignedAt: new Date() } }, { new: true })`. If result is null, return `AppError('Request no longer available', 409)`. Emit socket `booking:assigned` via `emitToBooking`. Return updated booking.
- **rejectRequest** `PATCH /api/partner/requests/:bookingId/reject` — No status change needed; optionally record in a log. Return `{ success:true }`.
- **updateJobStatus** `PATCH /api/partner/jobs/:bookingId/status` — Accept `{ status }` from body. Validate transition map (partner-side): `{ partner_assigned:['partner_on_way'], partner_on_way:['partner_arrived'], partner_arrived:['in_progress'], in_progress:['completed'] }`. Update booking, push to `statusHistory`, set timestamp fields accordingly (`partnerArrivedAt`, `serviceStartedAt`, `serviceCompletedAt`). Emit `booking:status_update` via `emitToBooking`. If `completed`, increment `PartnerProfile.completedJobs` and add `priceAtBooking` to `totalEarnings`. Return updated booking.
- **getMyJobs** `GET /api/partner/jobs` — Find bookings where `partnerId: req.user._id`, optionally filter by `?status=`. Sort by `startAt -1`. Populate `customerId vehicleId serviceId`.
- **uploadPhotos** `POST /api/partner/jobs/:bookingId/photos` — Accept `{ type:'before'|'after', urls:[...] }` in body. Append to `beforePhotos` or `afterPhotos` using `$push: { $each: urls }`. Return updated booking.

**File to create:** `server/src/controllers/partnerController.js`

**Gotchas:**
- Import `PartnerProfile` from `../models/PartnerProfile.js`
- Import `Booking` from `../models/Booking.js`
- Import `User` from `../models/User.js`
- Import `{ AppError }` from `../middleware/errorHandler.js`
- JWT signing: `jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })` — match authController pattern
- `acceptRequest` must use `findOneAndUpdate` (not find-then-save) to be atomic

### 3c. Create `server/src/routes/partnerRoutes.js`
```js
import { Router } from 'express';
import { protect, requirePartner } from '../middleware/auth.js';
import { registerPartner, getPartnerProfile, updatePartnerProfile,
  updateLocation, toggleAvailability, getNearbyRequests, acceptRequest,
  rejectRequest, updateJobStatus, getMyJobs, uploadPhotos } from '../controllers/partnerController.js';

const router = Router();
router.post('/register', registerPartner);
router.get('/profile',       protect, requirePartner, getPartnerProfile);
router.patch('/profile',     protect, requirePartner, updatePartnerProfile);
router.patch('/location',    protect, requirePartner, updateLocation);
router.patch('/availability',protect, requirePartner, toggleAvailability);
router.get('/requests',      protect, requirePartner, getNearbyRequests);
router.patch('/requests/:bookingId/accept', protect, requirePartner, acceptRequest);
router.patch('/requests/:bookingId/reject', protect, requirePartner, rejectRequest);
router.get('/jobs',          protect, requirePartner, getMyJobs);
router.patch('/jobs/:bookingId/status', protect, requirePartner, updateJobStatus);
router.post('/jobs/:bookingId/photos',  protect, requirePartner, uploadPhotos);
export default router;
```

**File to create:** `server/src/routes/partnerRoutes.js`

### 3d. Mount partner routes in `server/src/app.js`
Add after the existing route imports and mounts:
```js
import partnerRoutes from './routes/partnerRoutes.js';
// ...
app.use('/api/partner', partnerRoutes);
```

**File to modify:** `server/src/app.js`

### 3e. Update `ALLOWED_TRANSITIONS` in `server/src/controllers/adminController.js`
Add the new statuses so admin can also manage these transitions:
```js
searching_partner: ['partner_assigned', 'cancelled'],
partner_assigned:  ['partner_on_way', 'cancelled'],
partner_on_way:    ['partner_arrived', 'cancelled'],
partner_arrived:   ['in_progress', 'cancelled'],
```

**File to modify:** `server/src/controllers/adminController.js`

**Verify:** `cd server && npm run dev` — server starts without errors, `GET /api/health` returns `{status:'ok'}`.

---

## STEP 4 — Backend: Socket.IO integration

**Files to read first:**
- `server/src/server.js` — currently `app.listen(PORT, ...)`
- `server/package.json` — add `socket.io` dependency

### 4a. Add socket.io to `server/package.json`
Add to `"dependencies"`:
```json
"socket.io": "^4.7.5"
```

**File to modify:** `server/package.json`

Run `cd server && npm install` after editing.

### 4b. Create `server/src/services/socketService.js`
```js
import { Server } from 'socket.io';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  io.on('connection', (socket) => {
    socket.on('join:booking', ({ bookingId }) => socket.join(`booking:${bookingId}`));
    socket.on('join:partner', ({ partnerId }) => socket.join(`partner:${partnerId}`));
  });
  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitToBooking(bookingId, event, data) {
  if (io) io.to(`booking:${bookingId}`).emit(event, data);
}

export function emitToPartner(partnerId, event, data) {
  if (io) io.to(`partner:${partnerId}`).emit(event, data);
}
```

**File to create:** `server/src/services/socketService.js`

### 4c. Update `server/src/server.js`
Replace `app.listen` with `http.createServer`:
```js
import 'dotenv/config';
import http from 'http';
import connectDB from './config/db.js';
import app from './app.js';
import { initSocket } from './services/socketService.js';

const PORT = process.env.PORT || 5000;

let server;

const start = async () => {
  await connectDB();
  server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
```

**File to modify:** `server/src/server.js`

### 4d. Update `server/src/controllers/bookingController.js`
After `Booking.create(...)` in `createBooking`, add:
```js
// If immediate booking, set status to searching_partner and notify nearby partners
if (req.body.isImmediate === true) {
  booking.status = 'searching_partner';
  booking.isImmediate = true;
  await booking.save();
  // Emit to all connected partners (they filter by serviceCategories client-side)
  const { emitToPartner } = await import('../services/socketService.js');
  // We broadcast to a 'partners' room — partners must join this room on connect
  const { getIO } = await import('../services/socketService.js');
  try {
    getIO().to('partners').emit('new:request', {
      bookingId: booking._id,
      serviceId: booking.serviceId,
      location: booking.customerLocation,
    });
  } catch {} // socket may not be ready in tests
}
```

Also update `socketService.js` `initSocket` to handle a `join:partners` room:
```js
socket.on('join:partners', () => socket.join('partners'));
```

**Gotchas:**
- Use dynamic `import()` for `socketService` inside `bookingController` to avoid circular dependency issues, OR pass the io instance via a module-level setter. Dynamic import is simpler for now.
- `http` is a built-in Node.js module — no npm install needed.

**Verify:** `cd server && npm run dev` — server starts, WebSocket upgrade is accepted (check console for Socket.IO startup message).

---

## STEP 5 — Backend: Expanded service seed

**Files to read first:**
- `server/scripts/seedServices.js` — existing `defaultServices` array and `seedServicesData()` export
- `server/src/models/Service.js` — field names: `name, description, category, vehicleTypes, price, duration, isActive`

**What to do:**
Replace `defaultServices` in `server/scripts/seedServices.js` with the full catalogue. Keep the `seedServicesData()` function signature and its export. Change the `if (count > 0) return { skipped }` check to a force-clear: `await Service.deleteMany({})` before insert, so re-running always refreshes to the new catalogue.

```js
export const defaultServices = [
  // Cars - exterior
  { name: 'Basic Exterior Wash', description: 'Rinse, soap, and dry for cars.', category: 'exterior', vehicleTypes: ['Car'], price: 199, duration: 30, isActive: true },
  { name: 'Foam Wash', description: 'Foam cannon wash for thorough cleaning.', category: 'exterior', vehicleTypes: ['Car'], price: 249, duration: 35, isActive: true },
  // Cars - interior
  { name: 'Interior Vacuum', description: 'Full interior vacuuming.', category: 'interior', vehicleTypes: ['Car'], price: 249, duration: 30, isActive: true },
  { name: 'Dashboard & Door Panel Clean', description: 'Wipe-down of dashboard and door panels.', category: 'interior', vehicleTypes: ['Car'], price: 199, duration: 25, isActive: true },
  { name: 'Full Interior Clean', description: 'Complete interior clean including seats and floor mats.', category: 'interior', vehicleTypes: ['Car'], price: 499, duration: 60, isActive: true },
  // Cars - full
  { name: 'Interior + Exterior Wash', description: 'Complete interior and exterior wash.', category: 'full', vehicleTypes: ['Car'], price: 499, duration: 75, isActive: true },
  // Cars - premium
  { name: 'Premium Detailing', description: 'Full detailing with polish and deep interior clean.', category: 'premium', vehicleTypes: ['Car'], price: 1499, duration: 180, isActive: true },
  { name: 'Waxing & Polishing', description: 'Exterior wax and paint polish.', category: 'premium', vehicleTypes: ['Car'], price: 999, duration: 90, isActive: true },
  { name: 'Deep Interior Clean', description: 'Deep clean with odour treatment and sanitisation.', category: 'interior', vehicleTypes: ['Car'], price: 799, duration: 120, isActive: true },
  // Bikes
  { name: 'Bike Basic Wash', description: 'Exterior wash for bikes.', category: 'exterior', vehicleTypes: ['Bike'], price: 99, duration: 20, isActive: true },
  { name: 'Bike Foam Wash', description: 'Foam wash for bikes.', category: 'exterior', vehicleTypes: ['Bike'], price: 149, duration: 25, isActive: true },
  { name: 'Bike Full Clean', description: 'Complete wash and chain clean for bikes.', category: 'full', vehicleTypes: ['Bike'], price: 199, duration: 40, isActive: true },
  { name: 'Bike Premium Detail', description: 'Premium detailing for bikes.', category: 'premium', vehicleTypes: ['Bike'], price: 499, duration: 90, isActive: true },
  // Scooties
  { name: 'Scooty Basic Wash', description: 'Exterior wash for scooties.', category: 'exterior', vehicleTypes: ['Scooty'], price: 79, duration: 15, isActive: true },
  { name: 'Scooty Foam Wash', description: 'Foam wash for scooties.', category: 'exterior', vehicleTypes: ['Scooty'], price: 129, duration: 20, isActive: true },
  { name: 'Scooty Full Clean', description: 'Complete clean for scooties.', category: 'full', vehicleTypes: ['Scooty'], price: 149, duration: 35, isActive: true },
  { name: 'Scooty Premium Detail', description: 'Premium detailing for scooties.', category: 'premium', vehicleTypes: ['Scooty'], price: 299, duration: 60, isActive: true },
];
```

Update `seedServicesData()` to clear and reseed:
```js
export async function seedServicesData() {
  // Seed Schedule (unchanged)
  const existingSchedule = await Schedule.findOne({ isActive: true });
  if (!existingSchedule) {
    await new Schedule({ isActive: true }).save();
  }
  // Clear and reseed services
  await Service.deleteMany({});
  await Service.insertMany(defaultServices);
  return { seeded: true, count: defaultServices.length };
}
```

Also add `seed:full` to `server/package.json` scripts:
```json
"seed:full": "node scripts/seedAdmin.js && node scripts/seedServices.js"
```

**Gotchas:**
- Service names must be unique (schema has `unique: true`). `deleteMany` before insert avoids duplicate key errors.
- The `vehicleTypes` field is an array in the schema — pass single-element arrays for vehicle-specific services.

**Files to modify:**
- `server/scripts/seedServices.js`
- `server/package.json`

**Verify:** `cd server && npm run seed:services` — exits with "Services seeded: 17 services created."

---

## STEP 6 — Web: PWA manifest and offline page

**Files to read first:**
- `web/index.html` — currently has no manifest link
- Confirm `web/public/` directory does not yet exist (confirmed: it doesn't)

### 6a. Update `web/index.html`
Add inside `<head>` before closing `</head>`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0B1B2B" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

**File to modify:** `web/index.html`

### 6b. Create `web/public/manifest.json`
```json
{
  "name": "PROWASH — Premium Vehicle Cleaning",
  "short_name": "PROWASH",
  "description": "Professional vehicle washing at your doorstep",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B1B2B",
  "theme_color": "#147DAB",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**File to create:** `web/public/manifest.json`

### 6c. Create `web/public/icons/README.md`
Content: note that `icon-192.png` and `icon-512.png` are required for PWA installation and must be replaced with real PROWASH branded icons before production deployment. Placeholder files must be added for the build to serve them.

**File to create:** `web/public/icons/README.md`

### 6d. Create `web/public/offline.html`
A simple branded offline fallback page:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PROWASH — Offline</title>
  <style>
    body { font-family: Inter, sans-serif; background: #0B1B2B; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 1rem; }
    h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; }
    p  { color: rgba(255,255,255,0.7); max-width: 360px; }
    .badge { background: #147DAB; color: #fff; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <div class="badge">PROWASH</div>
  <h1>You're Offline</h1>
  <p>Please check your internet connection. Booking and live tracking require an active connection.</p>
</body>
</html>
```

**File to create:** `web/public/offline.html`

**Gotchas:**
- Vite serves everything in `web/public/` at the root. No further configuration needed.
- Do NOT register a service worker in code — the task says "Service worker only where appropriate" and "Do not pretend that online booking works offline." The manifest alone provides installability on supporting browsers.

**Verify:** `cd web && npm run build` — build succeeds and `dist/manifest.json` appears in output.

---

## STEP 7 — Web: Partner pages and routing

**Files to read first:**
- `web/src/App.jsx` — existing route structure and `ProtectedRoute`
- `web/src/context/AuthContext.jsx` — `login()` returns `user`, token stored as `prowash_token`
- `web/src/components/layout/AdminLayout.jsx` — sidebar/nav layout pattern to follow
- `web/src/pages/LoginPage.jsx` — login form pattern
- `web/src/api/axios.js` — `api` instance

### 7a. Create `web/src/api/partner.js`
```js
import api from './axios'
export const partnerAPI = {
  register:           (data)             => api.post('/partner/register', data),
  getProfile:         ()                 => api.get('/partner/profile'),
  updateProfile:      (data)             => api.patch('/partner/profile', data),
  updateLocation:     (data)             => api.patch('/partner/location', data),
  toggleAvailability: ()                 => api.patch('/partner/availability'),
  getNearbyRequests:  ()                 => api.get('/partner/requests'),
  acceptRequest:      (bookingId)        => api.patch(`/partner/requests/${bookingId}/accept`),
  rejectRequest:      (bookingId)        => api.patch(`/partner/requests/${bookingId}/reject`),
  getJobs:            (params = {})      => api.get('/partner/jobs', { params }),
  updateJobStatus:    (bookingId, status) => api.patch(`/partner/jobs/${bookingId}/status`, { status }),
  uploadPhotos:       (bookingId, data)  => api.post(`/partner/jobs/${bookingId}/photos`, data),
}
```

**File to create:** `web/src/api/partner.js`

### 7b. Create `web/src/pages/PartnerRegisterPage.jsx`
- Form fields: Full Name, Email, Phone, Password, Confirm Password, Service Categories (checkboxes: Car, Bike, Scooty)
- On submit: call `partnerAPI.register(data)`, store token (`localStorage.setItem('prowash_token', token)`), dispatch `SET_USER` via `updateUser` (or call `authAPI.getMe()` then `updateUser`)
- On success: `navigate('/partner')`
- Validation: password === confirmPassword, all required fields filled
- Style: match RegisterPage.jsx pattern

**File to create:** `web/src/pages/PartnerRegisterPage.jsx`

**Gotchas:**
- `partnerAPI.register` returns `{ token, user }` at top level (same shape as `authAPI.login`). After calling it, set `localStorage.setItem('prowash_token', token)` and call `updateUser(user)` from `useAuth()` context — do not call `authContext.login` (that calls auth API, not partner API). Then navigate.

### 7c. Create `web/src/pages/PartnerLoginPage.jsx`
- Same form as `LoginPage.jsx` but after successful login, check `user.role === 'partner'` and redirect to `/partner`
- Reuses `authContext.login()` (POST /api/auth/login handles all roles)
- If role is not `'partner'`, show error "This account is not a partner account."

**File to create:** `web/src/pages/PartnerLoginPage.jsx`

### 7d. Create `web/src/components/layout/PartnerLayout.jsx`
- Sidebar nav items: Dashboard (`/partner`), My Jobs (`/partner/jobs`), Profile (`/partner/profile`)
- Follow same structure as `AdminLayout.jsx` (fixed sidebar + top bar + `<Outlet />`)
- Show partner name in header

**File to create:** `web/src/components/layout/PartnerLayout.jsx`

### 7e. Create `web/src/pages/partner/PartnerDashboardPage.jsx`
State: `profile`, `requests`, `activeJobs`, `loading`

Layout:
1. **Availability toggle** — shows current status, button calls `partnerAPI.toggleAvailability()`, updates state
2. **Nearby Requests** — list from `partnerAPI.getNearbyRequests()`, each card shows service name, vehicle type, customer location address, price; "Accept" button calls `acceptRequest(bookingId)`, on success shows toast and refreshes
3. **Active Jobs** — `partnerAPI.getJobs({ status: 'partner_assigned,partner_on_way,partner_arrived,in_progress' })` — shows first active job prominently
4. **Stats row** — Completed Jobs, Total Earnings from profile

Socket.IO: connect to server on mount, join `join:partner` room, listen for `new:request` to refresh requests list. Use `socket.io-client` (added in Step 8).

**File to create:** `web/src/pages/partner/PartnerDashboardPage.jsx`

**Gotchas for 7e:**
- `socket.io-client` is added in Step 8. If implementing steps sequentially, add the package before this step or add a comment placeholder and wire up sockets in Step 8.
- To avoid circular dependency, import socket lazily or conditionally.

### 7f. Create `web/src/pages/partner/PartnerJobPage.jsx`
Props: `bookingId` from `useParams()`

- Fetch booking via `api.get('/partner/jobs')` filtered by id, or a generic booking detail endpoint
- Display: customer name, vehicle, service, scheduled time, customer location address
- Status buttons (rendered based on current status):
  - `partner_assigned` → "Head to Location" → transitions to `partner_on_way`
  - `partner_on_way` → "Mark Arrived" → transitions to `partner_arrived`
  - `partner_arrived` → "Start Service" → transitions to `in_progress`
  - `in_progress` → "Complete Service" → transitions to `completed`
- Photo upload section: file input for before/after photos (URLs or base64 for now; full upload service is optional)
- Real-time status via Socket.IO `booking:status_update` event

**File to create:** `web/src/pages/partner/PartnerJobPage.jsx`

### 7g. Create `web/src/pages/partner/PartnerJobsPage.jsx`
- List all jobs for the partner (`partnerAPI.getJobs()`)
- Status filter tabs (same as MyBookingsPage pattern)
- Each row: booking reference, service, date, status, "View" link to `/partner/jobs/:id`

**File to create:** `web/src/pages/partner/PartnerJobsPage.jsx`

### 7h. Create `web/src/pages/partner/PartnerProfilePage.jsx`
- Fetch and display `partnerAPI.getProfile()`
- Editable form: phone, vehicleOwned, serviceCategories (checkboxes), serviceRadius
- Save calls `partnerAPI.updateProfile(data)`

**File to create:** `web/src/pages/partner/PartnerProfilePage.jsx`

### 7i. Update `web/src/App.jsx`
1. Update `ProtectedRoute` to handle `role='partner'`:
   ```jsx
   if (role === 'partner' && user.role !== 'partner') return <Navigate to="/partner-login" replace />
   ```
   Also fix the existing customer/admin cross-redirect so partners navigating to `/dashboard` are sent to `/partner`.

2. Add lazy imports:
   ```js
   const PartnerDashboardPage = lazy(() => import('./pages/partner/PartnerDashboardPage'))
   const PartnerJobsPage      = lazy(() => import('./pages/partner/PartnerJobsPage'))
   const PartnerJobPage       = lazy(() => import('./pages/partner/PartnerJobPage'))
   const PartnerProfilePage   = lazy(() => import('./pages/partner/PartnerProfilePage'))
   ```

3. Add public routes:
   ```jsx
   <Route path="/partner-login"    element={<PartnerLoginPage />} />
   <Route path="/partner-register" element={<PartnerRegisterPage />} />
   ```

4. Add protected partner routes:
   ```jsx
   <Route
     path="/partner/*"
     element={
       <ProtectedRoute role="partner">
         <PartnerLayout />
       </ProtectedRoute>
     }
   >
     <Route index element={<PartnerDashboardPage />} />
     <Route path="jobs"     element={<PartnerJobsPage />} />
     <Route path="jobs/:id" element={<PartnerJobPage />} />
     <Route path="profile"  element={<PartnerProfilePage />} />
   </Route>
   ```

5. Add imports at top: `PartnerLoginPage, PartnerRegisterPage` (non-lazy, public), `PartnerLayout`.

**File to modify:** `web/src/App.jsx`

**Verify:** `cd web && npm run build` — zero errors.

---

## STEP 8 — Web: Real-time booking status in BookingWizard

**Files to read first:**
- `web/src/pages/customer/BookingWizard.jsx` — Step 5 shows `bookingResult`; this is where real-time tracking goes
- `web/package.json` — add `socket.io-client`

### 8a. Add `socket.io-client` to `web/package.json`
```json
"socket.io-client": "^4.7.5"
```

Run `cd web && npm install`.

**File to modify:** `web/package.json`

### 8b. Update `web/src/pages/customer/BookingWizard.jsx`
After `setBookingResult(...)` in `handleConfirm`, connect Socket.IO and watch for status updates.

Add to the component's state:
```js
const [liveStatus, setLiveStatus] = useState(null)
const [partnerInfo, setPartnerInfo] = useState(null)
const socketRef = useRef(null)
```

Add `useEffect` that runs when `bookingResult` is set:
```js
useEffect(() => {
  if (!bookingResult) return;
  // Connect socket and join booking room
  import('socket.io-client').then(({ io }) => {
    const socket = io(window.location.origin, { path: '/socket.io' });
    socketRef.current = socket;
    socket.emit('join:booking', { bookingId: bookingResult._id });
    socket.on('booking:assigned', (data) => {
      setLiveStatus('partner_assigned');
      setPartnerInfo(data.partner || null);
    });
    socket.on('booking:status_update', (data) => {
      setLiveStatus(data.status);
    });
  });
  // Polling fallback: poll every 10s if socket fails or as supplementary
  const poll = setInterval(async () => {
    try {
      const res = await bookingsAPI.getBooking(bookingResult._id);
      const b = res.data.data?.booking || res.data.data;
      if (b?.status) setLiveStatus(b.status);
      if (b?.partnerId) setPartnerInfo(b.partnerId);
    } catch {}
  }, 10000);
  return () => {
    if (socketRef.current) socketRef.current.disconnect();
    clearInterval(poll);
  };
}, [bookingResult]);
```

In the `Step5` success view (when `bookingResult` is set), replace the static "Booking Confirmed!" display with a live tracking card above the navigation link:
```jsx
// Status label map
const STATUS_LABELS = {
  pending:           '⏳ Booking Pending',
  searching_partner: '🔍 Searching for a Cleaning Partner...',
  partner_assigned:  '✅ Partner Assigned',
  partner_on_way:    '🚗 Partner is on the Way',
  partner_arrived:   '📍 Partner Arrived',
  in_progress:       '🧼 Cleaning in Progress',
  completed:         '✨ Service Completed!',
}
const displayStatus = liveStatus || bookingResult.status
```

Show a status card with:
- Booking reference
- Live status label (updates in real-time)
- Partner name (if `partnerInfo`)
- A subtle pulsing dot indicator when `searching_partner` or `partner_on_way`

**File to modify:** `web/src/pages/customer/BookingWizard.jsx`

**Gotchas:**
- Dynamic `import('socket.io-client')` avoids issues if the package isn't installed yet
- The `bookingsAPI.getBooking` in the polling fallback requires the API function to exist — it already exists in `web/src/api/bookings.js` (check it exports `getBooking`)
- The socket server path defaults to `/socket.io` which matches Express default

**Verify:** `cd web && npm run build` — zero errors. Manual test: create a booking, confirm socket connect log appears in browser console.

---

## STEP 9 — Web: Rapido-style home page update

**Files to read first:**
- `web/src/pages/customer/DashboardPage.jsx` — existing structure (greeting, stats, vehicles, services, bookings)
- `web/src/api/bookings.js` — available API functions

**What to do:**
Rewrite `DashboardPage.jsx` to add the Rapido-style features while keeping all existing sections. Do NOT remove the stats row, vehicles section, or recent bookings — add new sections around them.

**Additions:**

### 9a. Location bar (top of page, below greeting)
```jsx
const [locationLabel, setLocationLabel] = useState(
  localStorage.getItem('prowash_location_label') || ''
)

function detectLocation() {
  if (!navigator.geolocation) return toast.error('Geolocation not supported.')
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const label = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
      localStorage.setItem('prowash_location_label', label)
      setLocationLabel(label)
      toast.success('Location detected.')
    },
    () => toast.error('Could not detect location. Please type your address.')
  )
}
```
Render as: text input bound to `locationLabel` + "Use My Location" button that calls `detectLocation()`.

### 9b. Vehicle type quick-select cards
Below the location bar, show three large tap-to-book cards:
```jsx
const VEHICLE_CARDS = [
  { type: 'Car',    icon: Car,  label: 'Car Wash',    color: 'from-blue-500 to-blue-700'   },
  { type: 'Bike',   icon: Bike, label: 'Bike Wash',   color: 'from-green-500 to-green-700' },
  { type: 'Scooty', icon: Zap,  label: 'Scooty Wash', color: 'from-purple-500 to-purple-700' },
]
```
Each card navigates to `/dashboard/book?vehicleType=Car` (or Bike/Scooty).

### 9c. Popular packages — horizontal scroll
Fetch from `/api/services` (already done). Show top 4 as a horizontal-scroll row of cards. Each card: service name, price, "Book" button.

### 9d. Upcoming booking — prominent live-status card
```js
const upcomingBooking = bookings.find(b =>
  ['pending','confirmed','searching_partner','partner_assigned',
   'partner_on_way','partner_arrived','in_progress'].includes(b.status)
)
```
If found, show a card at the top (below the CTA banner) with:
- Booking reference
- Service name, vehicle
- Date/time
- A live status dot: green pulsing for active statuses, yellow for pending
- "View Details" link to `/dashboard/bookings/:id`

### 9e. Recent activity — last 3 completed bookings
```js
const recentCompleted = bookings.filter(b => b.status === 'completed').slice(0, 3)
```
Show as a compact list with service name, date, price.

**File to modify:** `web/src/pages/customer/DashboardPage.jsx`

**Verify:** `cd web && npm run build` — zero errors. Visual check: customer dashboard shows location bar, vehicle type cards, upcoming booking card if one exists.

---

## STEP 10 — Admin: Partner management pages and backend

**Files to read first:**
- `server/src/controllers/adminController.js` — existing patterns (`getCustomers`, `getCustomerDetails`)
- `server/src/routes/adminRoutes.js` — existing route registrations
- `web/src/components/layout/AdminLayout.jsx` — NAV_ITEMS to add Partners link
- `web/src/api/admin.js` — to add partner API methods
- `web/src/pages/admin/AdminCustomersPage.jsx` — table pattern to follow

### 10a. Add partner admin handlers to `server/src/controllers/adminController.js`
Add these four functions at the bottom of the file:

**getPartners** `GET /api/admin/partners`:
- Filter: `User.find({ role: 'partner' })` (paginated, with optional `?search=` on name/email)
- For each user, lookup `PartnerProfile` by `userId`
- Return combined list with `isVerified, isAvailable, rating, completedJobs`
- Use `User.aggregate` with `$lookup` to `partnerprofiles` collection for efficiency

**getPartnerById** `GET /api/admin/partners/:id`:
- Find `User` by id where `role='partner'`
- Find `PartnerProfile` by `userId: id`
- Find last 10 jobs: `Booking.find({ partnerId: id })` sorted by `createdAt -1`
- Return `{ partner: user, profile, recentJobs, stats: { completedJobs, totalEarnings } }`

**verifyPartner** `PATCH /api/admin/partners/:id/verify`:
- `PartnerProfile.findOneAndUpdate({ userId: id }, { $set: { isVerified: true } }, { new: true })`
- Return updated profile

**deactivatePartner** `PATCH /api/admin/partners/:id/deactivate`:
- `User.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })`
- `PartnerProfile.findOneAndUpdate({ userId: id }, { $set: { isActive: false } })`
- Return `{ success: true }`

**File to modify:** `server/src/controllers/adminController.js`

### 10b. Add partner routes to `server/src/routes/adminRoutes.js`
Import new handlers and add routes:
```js
import { ..., getPartners, getPartnerById, verifyPartner, deactivatePartner } from '../controllers/adminController.js';

router.get('/partners',                 protect, requireAdmin, getPartners);
router.get('/partners/:id',             protect, requireAdmin, getPartnerById);
router.patch('/partners/:id/verify',    protect, requireAdmin, verifyPartner);
router.patch('/partners/:id/deactivate',protect, requireAdmin, deactivatePartner);
```

**File to modify:** `server/src/routes/adminRoutes.js`

### 10c. Add partner API calls to `web/src/api/admin.js`
```js
getPartners:       (params = {}) => api.get('/admin/partners', { params }),
getPartner:        (id)          => api.get(`/admin/partners/${id}`),
verifyPartner:     (id)          => api.patch(`/admin/partners/${id}/verify`),
deactivatePartner: (id)          => api.patch(`/admin/partners/${id}/deactivate`),
```

**File to modify:** `web/src/api/admin.js`

### 10d. Create `web/src/pages/admin/AdminPartnersPage.jsx`
Table columns: Name, Email, Phone, Verified (badge), Available (badge), Rating, Completed Jobs, Actions
- "Verify" button (only shown when `!isVerified`) calls `adminAPI.verifyPartner(id)`, refreshes row
- "View" link to `/admin/partners/:id`
- Search bar (filter by name/email via `?search=` query param)
- Pagination (follow `AdminCustomersPage` pattern)

**File to create:** `web/src/pages/admin/AdminPartnersPage.jsx`

### 10e. Create `web/src/pages/admin/AdminPartnerDetailPage.jsx`
Sections:
1. Partner profile card: name, email, phone, verification badge, active status
2. Service categories and radius
3. Documents list (if any)
4. Earnings summary: total earnings, completed jobs
5. Recent jobs table (last 10 bookings with this partner)
6. Action buttons: "Verify Partner" / "Deactivate Partner"

**File to create:** `web/src/pages/admin/AdminPartnerDetailPage.jsx`

### 10f. Add Partners link to `web/src/components/layout/AdminLayout.jsx`
In `NAV_ITEMS`, add after Customers:
```js
{ to: '/admin/partners', icon: UserCheck, label: 'Partners' },
```
Import `UserCheck` from `lucide-react`.

**File to modify:** `web/src/components/layout/AdminLayout.jsx`

### 10g. Add admin partner routes to `web/src/App.jsx`
Add lazy imports:
```js
const AdminPartnersPage       = lazy(() => import('./pages/admin/AdminPartnersPage'))
const AdminPartnerDetailPage  = lazy(() => import('./pages/admin/AdminPartnerDetailPage'))
```

Add routes inside the `/admin/*` block:
```jsx
<Route path="partners"     element={<AdminPartnersPage />} />
<Route path="partners/:id" element={<AdminPartnerDetailPage />} />
```

**File to modify:** `web/src/App.jsx`

**Verify:** `cd web && npm run build` — zero errors. Manual test: navigate to `/admin/partners`, table renders without crash.

---

## Final end-to-end verification

After all 10 steps:
1. `cd server && npm install` — installs `socket.io`
2. `cd web && npm install` — installs `socket.io-client`
3. `cd server && npm run dev` — server starts on port 5000
4. `cd web && npm run dev` — Vite dev server starts
5. `cd web && npm run build` — production build succeeds with zero errors

Optional smoke tests (manual):
- Register a partner → login → toggle availability
- Customer creates an immediate booking → partner dashboard shows the request → accept → status updates live in BookingWizard
- Admin navigates to `/admin/partners` → sees the registered partner → verifies them

---

## Key cross-cutting gotchas (all steps)

| Concern | Rule |
|---|---|
| ES module imports | All server files use `.js` extension in import paths (e.g., `import X from './models/User.js'`) |
| `AppError` | Import from `'../middleware/errorHandler.js'` — never throw plain errors in controllers |
| Error handling in web | Always catch `err.message`, never `err.response?.data?.message` (interceptor normalises) |
| Existing Booking fields | Only ADD fields in Step 2 — do not remove `confirmed` from status enum |
| Socket.IO circular dep | Import `socketService` dynamically inside controller functions or use a module-level setter |
| `PartnerProfile` Mongoose field naming | The nested `type` field in `documents` subdocument — Mongoose reserves `type`; define it as `{ type: { type: String }, ... }` to avoid conflict |
| `UserCheck` icon | Available in `lucide-react` — verify import name before use |
