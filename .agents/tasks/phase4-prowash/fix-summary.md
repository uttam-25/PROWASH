# Phase 4 Integration Fix Summary

**Iteration:** 1 (no prior verdict.json)

## Issues Found and Fixed

### 1. Route conflict — `customerRoutes` shadowing `adminController` customer endpoints (server)

**File:** `server/src/app.js`

**Problem:**  
`app.use('/api/admin/customers', customerRoutes)` was mounted before `app.use('/api/admin', adminRoutes)`. Because Express matches routes in registration order, all requests to `/api/admin/customers` and `/api/admin/customers/:id` were handled by the old `customerController` (via `customerRoutes`) rather than the new `adminController` functions added in FEAT-001.

The old `customerController.getAllCustomers` returned `data.items` (not `data.customers`) and did not include the `totalBookings` aggregation. The old `customerController.getCustomer` returned an incomplete shape: no `stats`, no `vehicles`, and used wrong populate fields (`customer` instead of `customerId`). The mobile screens (`AdminCustomersScreen`, `AdminCustomerDetailsScreen`) were rewritten in FEAT-002 to expect the new response shape from `adminController`.

**Fix:**  
Removed `import customerRoutes from './routes/customerRoutes.js'` and the `app.use('/api/admin/customers', customerRoutes)` mount entirely. All `/api/admin/customers` traffic now correctly flows to `adminRoutes` → `adminController.getCustomers` / `adminController.getCustomerDetails`, which return the expected `data.customers`, `data.stats`, `data.vehicles`, and `data.recentBookings` shapes.

The `toggleCustomerActive` endpoint (`PUT /api/admin/customers/:id/toggle`) from the old `customerRoutes` is intentionally not re-added — FEAT-002 step 6 explicitly removed the toggle-active button and all related state from `AdminCustomerDetailsScreen`.

---

### 2. Break field name mismatch — `start`/`end` vs `startTime`/`endTime` (mobile)

**File:** `mobile/src/screens/admin/AdminScheduleScreen.js`

**Problem:**  
The Schedule model's `breakSchema` uses field names `startTime` and `endTime`. In `AdminScheduleScreen`, the `handleAddBreak` function was building new break objects with `{ start, end }` (wrong keys). When those breaks were saved to the server and then re-loaded, the display loop `{b.start} – {b.end}` would render empty strings because the server returns `startTime`/`endTime`.

**Fix:**  
- Changed `handleAddBreak` to create `{ startTime: newBreakStart, endTime: newBreakEnd }`.
- Changed the breaks render loop to read `{b.startTime} – {b.endTime}`.

---

## Verification

- `node -e "import('./src/app.js').then(...)"` → `app loaded OK`
- `node -e "import('./src/routes/adminRoutes.js').then(...)"` → `adminRoutes loaded OK`
- `node -e "import('./src/controllers/adminController.js').then(m=>console.log(Object.keys(m).join(', ')))"` → all 16 exports confirmed
- `npx expo export --platform android` → exit 0, no error lines
