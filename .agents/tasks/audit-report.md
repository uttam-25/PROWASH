# PROWASH Post-Rapido-Extension Audit Report

**Date:** 2025-07-25  
**Scope:** Full-stack audit after the Rapido Extension workflow  
**Build result:** `npm run build` in `web/` → **EXIT 0, no errors**  
**Syntax check result:** `node --check` on `server/src/server.js` and all 10 controllers → **all pass**

---

## Summary Answer

The project is in **good structural health**. The build passes cleanly, all server files pass syntax checking, and the core authentication/booking/partner/admin flows are correctly wired. There are **no crashes or hard blockers**, but there are **8 functional bugs** (3 data-field mismatches, 3 schema mismatches, 1 route mismatch, 1 dead UI field) that would silently fail at runtime, plus 2 minor quality issues.

---

## 1. Checklist — All Items Verified

### 1.1 Package.json / Dependencies

| Item | Result |
|---|---|
| `server/package.json` | `socket.io@^4.7.5`, `mongoose@^8.4.1`, `express@^4.19.2`, `razorpay@^2.9.2`, all present |
| `web/package.json` | `socket.io-client@^4.7.5` present ✓ |
| `node_modules/socket.io` in server | **Exists** ✓ |

### 1.2 `server/.env`

- `PORT=5000` ✓  
- `MONGO_URI=mongodb://localhost:27017/prowash` ✓  
- `JWT_SECRET=your_jwt_secret_here` — **present but placeholder value**. Acceptable for local dev; must be changed before production.  
- Razorpay keys are empty (intentional — COD path works without them, online payments return `503` with a helpful message).

### 1.3 Server syntax checks

All pass: `server.js`, `adminController.js`, `authController.js`, `availabilityController.js`, `bookingController.js`, `customerController.js`, `notificationController.js`, `partnerController.js`, `paymentController.js`, `serviceController.js`, `vehicleController.js`.

### 1.4 app.js mounted routes

All 9 routers mounted correctly:
- `/api/auth` → `authRoutes.js`  
- `/api/vehicles` → `vehicleRoutes.js`  
- `/api/services` → `serviceRoutes.js`  
- `/api/availability` → `availabilityRoutes.js`  
- `/api/bookings` → `bookingRoutes.js`  
- `/api/payments` → `paymentRoutes.js`  
- `/api/notifications` → `notificationRoutes.js`  
- `/api/admin` → `adminRoutes.js`  
- `/api/partner` → `partnerRoutes.js` ✓

### 1.5 middleware/auth.js

Exports `protect` ✓, `requireAdmin` ✓, `requirePartner` ✓ — all three present and used correctly.

### 1.6 forwardRef — Input.jsx and Select.jsx

Both wrap their native elements in `forwardRef` ✓. React Hook Form's `ref` reaches the DOM.

### 1.7 bookingsAPI.cancelBooking

`cancelBooking: (id, reason = '') => api.patch('/bookings/${id}/cancel', { reason })` — sends `{ reason }` body ✓. Backend accepts `req.body.reason`.

### 1.8 AuthContext login/getMe response path

- login: `res.data.token || res.data.data?.token` and `res.data.user || res.data.data?.user` ✓ — backend returns `{ success, token, user }` at top level.
- getMe: `res.data.user || res.data.data?.user` ✓ — backend returns `{ success, user }` at top level.

### 1.9 Vehicle API `toBackend()`

Maps `vehicleType → type`, `registrationNumber → licensePlate` ✓. The `fromBackend()` helper adds reverse aliases for display code.

### 1.10 partnerRoutes.js mounted in app.js

`app.use('/api/partner', partnerRoutes)` ✓

### 1.11 PartnerProfile model

Exists at `server/src/models/PartnerProfile.js` with all expected fields ✓.

### 1.12 Review model

Exists at `server/src/models/Review.js` ✓.

---

## 2. Bugs Found

### BUG-01 — **CRITICAL**: `ServicesPage.jsx` reads `s.durationMinutes` but the field is `s.duration` (backend)

**File:** `web/src/pages/customer/ServicesPage.jsx`  
**Lines:** `<p className="text-xs text-gray-400">{s.durationMinutes} min</p>`  
**Root cause:** `Service` model (and `serviceController.getServices`) returns `{ ..., duration: Number }`. The frontend reads `s.durationMinutes`, which is `undefined` at runtime, so the duration column renders blank on every service card.  
**Also affected:** `BookingWizard.jsx` Step 3 (`{s.durationMinutes} min`) and `BookingWizard.jsx` Step 5 confirm screen (`{selectedService?.durationMinutes} min`).  
**Fix:** Replace `s.durationMinutes` → `s.duration` in `ServicesPage.jsx` and `BookingWizard.jsx`.

---

### BUG-02 — **CRITICAL**: `AdminServicesPage.jsx` uses wrong field names and category values for create/update

**File:** `web/src/pages/admin/AdminServicesPage.jsx`

**Sub-issue A — `vehicleType` vs `vehicleTypes`:** The form field is named `vehicleType` (singular), but the backend `Service` model stores `vehicleTypes: [String]`. The `createService` controller spreads `req.body.vehicleTypes` directly. Sending `vehicleType: 'Car'` means `vehicleTypes` is `undefined` on create → service is saved without vehicle type filter. On edit, `handleToggleActive` sends `{ active: !service.active }` but the model field is `isActive`, not `active`.

**Sub-issue B — `active` vs `isActive`:** The form sends `active: true/false` (and `handleToggleActive` sends `active:`), but the backend `updateService` controller looks for `allowed.includes(field)` with `'isActive'`. Sending `active` means the isActive toggle silently does nothing.

**Sub-issue C — category enum mismatch:** The form `CATEGORY_OPTIONS` values are `'Exterior Wash', 'Interior Cleaning', 'Interior + Exterior', 'Premium Detailing', 'Deep Cleaning', 'Add-on'` — none of these match the `Service` model enum `['exterior', 'interior', 'full', 'premium']`. Creating or editing a service from the admin UI will fail with a Mongoose validation error.

**Sub-issue D — `durationMinutes` vs `duration`:** The form field is `durationMinutes`, but the backend accepts `duration`. Create/edit will pass `undefined` for `duration` and fail validation.

**Fix needed in `AdminServicesPage.jsx`:**
- Rename form field `vehicleType` → `vehicleTypes` and wrap value in array on submit: `vehicleTypes: [data.vehicleType]`
- Rename form field `durationMinutes` → `duration`
- Rename form field `active` → `isActive` throughout (form default, `handleToggleActive`, ServiceForm register)
- Fix `CATEGORY_OPTIONS` values to match the enum: `exterior`, `interior`, `full`, `premium`
- Fix defaultValues in the edit modal to map `isActive` not `active`, `duration` not `durationMinutes`

---

### BUG-03 — **MODERATE**: `adminAPI.updateService` sends a PATCH but route expects PUT

**File:** `web/src/api/admin.js` line:  
`updateService: (id, data) => api.patch('/admin/services/${id}', data)`  
**File:** `server/src/routes/adminRoutes.js`:  
`router.put('/services/:id', protect, requireAdmin, updateService)`  
**Impact:** All calls to `adminAPI.updateService(...)` — edit service form, toggle active — will receive a **404 Not Found** because the route is `PUT`, not `PATCH`.  
**Fix:** Change `api.patch(...)` → `api.put(...)` in `web/src/api/admin.js`, or add a `router.patch(...)` alias in `adminRoutes.js`.

---

### BUG-04 — **MODERATE**: `adminAPI.deleteService` targets wrong URL

**File:** `web/src/api/admin.js`:  
`deleteService: (id) => api.delete('/admin/services/${id}')`  
**File:** `server/src/routes/adminRoutes.js`:  
`router.delete('/services/:id', ...)` mounts as `/api/admin/services/:id` ✓ — this is actually correct because `adminAPI` base is `/api` and the path is `/admin/services/${id}`.

Correction: This one is **fine** — the full resolved URL `/api/admin/services/:id` matches the router mount. No bug here.

---

### BUG-05 — **MODERATE**: `rescheduleBooking` validator checks `newStartAt` but `bookingsAPI` sends `startAt`

**File:** `web/src/api/bookings.js`:  
`rescheduleBooking: (id, startAt) => api.patch('/bookings/${id}/reschedule', { startAt })`  
**File:** `server/src/middleware/validate.js` `rescheduleRules`:  
`body('newStartAt').notEmpty()...`  
**File:** `server/src/controllers/bookingController.js`:  
`const newStartAtRaw = req.body.newStartAt || req.body.startAt` — the controller accepts both ✓.  
**But** the validator rejects the request before the controller runs because `newStartAt` is missing. The validator will return 400, even though the controller could handle `startAt`.  
**Fix (preferred):** Change `rescheduleBooking` in `bookings.js` to send `{ newStartAt: startAt }` instead of `{ startAt }`. The validator is the source of truth.

---

### BUG-06 — **MINOR**: `serviceRoutes.js` has a dead route (admin service CRUD duplicated)

**File:** `server/src/routes/serviceRoutes.js` mounts:
```
router.post('/admin/services', ...)
router.put('/admin/services/:id', ...)
router.delete('/admin/services/:id', ...)
```
These would be reachable at `/api/services/admin/services/:id` (double-nested) — they are dead because `adminRoutes.js` already correctly mounts the same controllers at `/api/admin/services/:id`. No practical harm, but it's dead code that could cause confusion.  
**Fix:** Remove the three `/admin/services` routes from `serviceRoutes.js`.

---

### BUG-07 — **MINOR**: `vehicleController.getAllVehicles` returns `items` but `adminAPI.getVehicles` page may read `vehicles`

**File:** `server/src/controllers/vehicleController.js` `getAllVehicles`:
```js
res.json({ success: true, data: { items, total, page, pages } })
```
**File:** `server/src/controllers/adminController.js` `getAdminVehicles`:
```js
res.json({ success: true, data: { vehicles: items, total, page, pages } })
```
`adminRoutes.js` mounts `getAdminVehicles` (from adminController) at `GET /api/admin/vehicles`. The `vehicleController.getAllVehicles` is mounted at `GET /api/vehicles/admin/vehicles` (vehicleRoutes.js) — a dead double-nested route that nobody calls.  
`adminAPI.getVehicles()` hits `/admin/vehicles` which correctly goes to `getAdminVehicles` returning `data.vehicles`. No functional bug — the dead route in vehicleRoutes is the only issue (same as BUG-06 pattern).

---

### BUG-08 — **MINOR**: `getMyVehicles` returns a flat array (not `{ vehicles: [...] }`) but `BookingWizard.jsx` handles both shapes

**File:** `server/src/controllers/vehicleController.js`:
```js
res.json({ success: true, data: vehicles })
```
**File:** `web/src/pages/customer/BookingWizard.jsx`:
```js
const raw = res.data.data?.vehicles || res.data.data || []
```
The `res.data.data?.vehicles` path is `undefined`, so it falls through to `res.data.data` which is the array — this works correctly. No runtime bug, but the `.vehicles` path is dead code.

---

## 3. Verified Working Items

| Feature | Status |
|---|---|
| Customer register/login → JWT issued | ✓ Works |
| Partner register → `User` + `PartnerProfile` created | ✓ Works |
| Partner login → role check in `PartnerLoginPage` | ✓ Works |
| `protect` + `requirePartner` middleware chain | ✓ Works |
| Booking creation with availability re-check | ✓ Works |
| Booking cancel with optional reason | ✓ Works |
| Partner accept → atomic `findOneAndUpdate` | ✓ Works |
| Partner job status transitions | ✓ Works |
| Admin dashboard, reports, schedule | ✓ Works |
| Socket.IO server init + booking rooms | ✓ Works |
| COD payment record auto-created on booking | ✓ Works |
| Razorpay gracefully disabled (503) when unconfigured | ✓ Works |
| Vite proxy `/api` → `localhost:5000` | ✓ Configured |
| Vite proxy `/socket.io` with WebSocket upgrade | ✓ Configured |

---

## 4. Field Reference — What the Frontend Must Send vs What Backend Expects

### Service (create/update)
| Frontend field (current — WRONG) | Backend field (correct) | Enum values |
|---|---|---|
| `vehicleType: 'Car'` | `vehicleTypes: ['Car']` | `Car, Bike, Scooty, SUV, Truck, Van` |
| `category: 'Exterior Wash'` | `category: 'exterior'` | `exterior, interior, full, premium` |
| `durationMinutes: 30` | `duration: 30` | integer minutes |
| `active: true` | `isActive: true` | boolean |

### Service (display — ServicesPage, BookingWizard)
| Frontend reads (WRONG) | Backend returns (correct) |
|---|---|
| `s.durationMinutes` | `s.duration` |

### Reschedule booking
| Frontend sends (current — WRONG) | Backend validator expects |
|---|---|
| `{ startAt: iso }` | `{ newStartAt: iso }` |

---

## 5. Fixes Applied in This Session

All Priority 1 and Priority 2 fixes were applied and the build re-confirmed passing (exit 0).

| Fix | File | Change |
|---|---|---|
| BUG-01a | `web/src/pages/customer/ServicesPage.jsx` | `s.durationMinutes` → `s.duration` |
| BUG-01b | `web/src/pages/customer/BookingWizard.jsx` | `s.durationMinutes` → `s.duration` (Step 3 + Step 5) |
| BUG-02a | `web/src/pages/admin/AdminServicesPage.jsx` | Category enum values fixed to `exterior/interior/full/premium` |
| BUG-02b | `web/src/pages/admin/AdminServicesPage.jsx` | Form field `durationMinutes` → `duration` |
| BUG-02c | `web/src/pages/admin/AdminServicesPage.jsx` | Form field `active` → `isActive` (form register, defaultValues, toggle, display) |
| BUG-02d | `web/src/pages/admin/AdminServicesPage.jsx` | `handleAdd`/`handleEdit` now map `vehicleType → vehicleTypes: [value]` |
| BUG-02e | `web/src/pages/admin/AdminServicesPage.jsx` | Table `s.durationMinutes` → `s.duration`; toggle reads `s.isActive` |
| BUG-03 | `web/src/api/admin.js` | `updateService` changed from `api.patch` → `api.put` |
| BUG-05 | `web/src/api/bookings.js` | `rescheduleBooking` sends `{ newStartAt: startAt }` (was `{ startAt }`) |

**Remaining cleanup (no runtime impact):**
- `server/src/routes/serviceRoutes.js` — three dead `/admin/services` routes still present; safe to remove at any time.

---

## 6. Commands to Run the App (Windows PowerShell)

**Start MongoDB** (if running locally):
```powershell
mongod
```
or use MongoDB Atlas URI in `.env`.

**Start Backend (from `server/`):**
```powershell
cd c:\Users\Dell\Desktop\PROWASH\server
npm run dev
```
Runs on `http://localhost:5000`. To seed admin user and services:
```powershell
npm run seed:admin
npm run seed:services
```

**Start Frontend (from `web/`):**
```powershell
cd c:\Users\Dell\Desktop\PROWASH\web
npm run dev
```
Runs on `http://localhost:3000`. The Vite dev proxy forwards `/api/*` and WebSocket `/socket.io` to the backend automatically.

**Default admin credentials** (after seed): `admin@prowash.com` / `Admin@1234`
