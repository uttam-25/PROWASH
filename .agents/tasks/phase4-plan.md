# Phase 4 Implementation Plan — PROWASH

## Overview
Phase 4 adds admin-side backend functions (schedule management, customers, vehicles, payments/COD collection) and completes all stub admin screens on mobile, plus a new AdminMoreScreen. Work is split into two sequential features: FEAT-001 (backend) then FEAT-002 (mobile).

---

## FEAT-001 — Backend: Payment model update + new admin controller functions + route additions

- [ ] 1. **Update `server/src/models/Payment.js`**
  - Rename `booking` → `bookingId` (ref Booking, required, unique), `customer` → `customerId` (ref User, required). Keep backward-compat index comments.
  - Change method enum to `['cod', 'online']` (drop 'razorpay').
  - Change status enum to `['unpaid', 'pending', 'paid', 'failed', 'refunded']`, default `'unpaid'`.
  - Add fields: `gatewayOrderId`, `gatewayPaymentId`, `gatewaySignature`, `transactionReference` (all String).
  - Add `collectedAt` (Date), `collectedBy` (ObjectId ref User).
  - Add `refundAmount` (Number), `refundReason` (String), `refundedAt` (Date).
  - Keep `timestamps: true`.
  - **Files:** `server/src/models/Payment.js`
  - **Verify:** `cd c:\Users\Dell\Desktop\PROWASH\server && node -e "import('./src/models/Payment.js').then(m=>console.log('OK',Object.keys(m.default.schema.paths)))"`

- [ ] 2. **Add schedule, customers, vehicles, and payments functions to `server/src/controllers/adminController.js`**
  
  Import `Schedule` and `Vehicle` at the top (alongside existing imports). Add these exports WITHOUT removing existing ones:

  - `getSchedule`: `Schedule.findOne()` (singleton), return `{success:true, data: schedule || {}}`.
  - `updateSchedule`: destructure `{workingDays, openingTime, closingTime, slotIntervalMinutes, maxConcurrentBookings, breaks}` from body; validate `openingTime`/`closingTime` match `/^\d{2}:\d{2}$/`; `Schedule.findOneAndUpdate({}, {$set:{...fields}}, {upsert:true, new:true, setDefaultsOnInsert:true})`; return `{success:true, data:schedule}`.
  - `addBlockedPeriod`: destructure `{label, startAt, endAt}`; validate both are Date-parseable, `startAt < endAt`, both `>= now`; `Schedule.findOneAndUpdate({}, {$push:{blockedPeriods:{label, startAt:new Date(startAt), endAt:new Date(endAt)}}}, {upsert:true, new:true})`; return `{success:true, data:schedule}`.
  - `removeBlockedPeriod`: `Schedule.findOneAndUpdate({}, {$pull:{blockedPeriods:{_id: req.params.periodId}}}, {new:true})`; return `{success:true, data:schedule}`.
  - `addHoliday`: destructure `{date, label}`; validate `date` matches `/^\d{4}-\d{2}-\d{2}$/`; `$push` to `schedule.holidays`; return `{success:true, data:schedule}`.
  - `removeHoliday`: `$pull` from `schedule.holidays` by `{_id: req.params.holidayId}`; return `{success:true, data:schedule}`.
  - `getCustomers`: `page`/`limit` from query; aggregate on User (`role:'customer'`) to count bookings per customer via `$lookup` on bookings; support `?search=` (regex on name/email/phone); return `{success:true, data:{customers, total, page, pages}}`.
  - `getCustomerDetails`: load `User.findById(id)`; aggregate booking stats `{total, completed, pending, cancelled}`; load vehicles `Vehicle.find({owner:id})`; load recent 5 bookings populated; return `{success:true, data:{customer, stats, vehicles, recentBookings}}`.
  - `getAdminVehicles`: paginate `Vehicle.find(filter).populate('owner','name email phone')`; filter `?type=`, `?search=` (regex on licensePlate); return `{success:true, data:{vehicles, total, page, pages}}`.
  - `getPayments`: paginate `Payment.find(filter).populate('bookingId','bookingReference customerId serviceNameSnapshot startAt').populate({path:'bookingId', populate:{path:'customerId',select:'name'}})` — actually use chained populate. Filter `?method=`, `?status=`. Sort `createdAt -1`. Return `{success:true, data:{payments, total, page, pages}}`.
  - `recordCODCollection`: `Payment.findById(id)`; verify `payment.method === 'cod'` and `payment.status === 'unpaid'`; set `status='paid'`, `collectedAt=new Date()`, `collectedBy=req.user._id`; save; update linked booking: `Booking.findByIdAndUpdate(payment.bookingId, {paymentStatus:'paid'})`; create `Notification` to customer (user:`bookingId.customerId`); return `{success:true, data:payment}`.

  - **Files:** `server/src/controllers/adminController.js`
  - **Verify:** `cd c:\Users\Dell\Desktop\PROWASH\server && node -e "import('./src/controllers/adminController.js').then(m=>console.log('exports:', Object.keys(m).join(', ')))"`

- [ ] 3. **Add `?includeInactive=true` support to `serviceController.js` `getServices`**
  - In `getServices`, change filter init to: `const filter = req.query.includeInactive === 'true' ? {} : { isActive: true };`
  - Keep category/vehicleType filters.
  - **Files:** `server/src/controllers/serviceController.js`
  - **Verify:** `cd c:\Users\Dell\Desktop\PROWASH\server && node -e "import('./src/controllers/serviceController.js').then(m=>console.log('OK',Object.keys(m).join(', ')))"`

- [ ] 4. **Update `server/src/routes/adminRoutes.js`** — add new routes, keep all existing ones
  - Import new functions from `adminController.js`: `getSchedule, updateSchedule, addBlockedPeriod, removeBlockedPeriod, addHoliday, removeHoliday, getCustomers, getCustomerDetails, getAdminVehicles, getPayments, recordCODCollection`.
  - **Remove** the old `getAllVehicles` import from `vehicleController.js` (replaced by `getAdminVehicles`). Keep the route at `GET /vehicles` but now wired to `getAdminVehicles`.
  - **Remove** the old `getAllPayments`/`updatePaymentStatus` imports from `paymentController.js` and the old payment routes. Replace `GET /payments` with `getPayments`. Add `PATCH /payments/:id/collect → recordCODCollection`.
  - Add routes:
    ```
    router.get('/schedule', protect, requireAdmin, getSchedule);
    router.put('/schedule', protect, requireAdmin, updateSchedule);
    router.post('/schedule/block', protect, requireAdmin, addBlockedPeriod);
    router.delete('/schedule/block/:periodId', protect, requireAdmin, removeBlockedPeriod);
    router.post('/schedule/holiday', protect, requireAdmin, addHoliday);
    router.delete('/schedule/holiday/:holidayId', protect, requireAdmin, removeHoliday);
    router.get('/customers', protect, requireAdmin, getCustomers);
    router.get('/customers/:id', protect, requireAdmin, getCustomerDetails);
    router.get('/vehicles', protect, requireAdmin, getAdminVehicles);
    router.get('/payments', protect, requireAdmin, getPayments);
    router.patch('/payments/:id/collect', protect, requireAdmin, recordCODCollection);
    ```
  - Keep existing `setSchedule` import removed (replaced by `getSchedule`/`updateSchedule`). Note: the old `POST /schedule → setSchedule` is replaced by `PUT /schedule`.
  - **Files:** `server/src/routes/adminRoutes.js`
  - **Verify:** `cd c:\Users\Dell\Desktop\PROWASH\server && node -e "import('./src/routes/adminRoutes.js').then(m=>console.log('routes loaded OK'))"`

---

## FEAT-002 — Mobile: adminService + complete all admin screens + AdminMoreScreen + AdminNavigator update

- [ ] 5. **Create `mobile/src/services/adminService.js`**
  - All methods use `api` from `./api`, returning `r.data`.
  - Pattern mirrors `bookingService.js` (object with named methods, no named function re-exports needed).
  ```js
  export const adminService = {
    getDashboard: () => api.get('/admin/dashboard').then(r => r.data),
    getReports: () => api.get('/admin/reports').then(r => r.data),
    getBookings: (params) => api.get('/admin/bookings', { params }).then(r => r.data),
    getBookingDetails: (id) => api.get(`/admin/bookings/${id}`).then(r => r.data),
    updateBookingStatus: (id, status, note) => api.patch(`/admin/bookings/${id}/status`, { status, note }).then(r => r.data),
    getServices: (params) => api.get('/services', { params }).then(r => r.data),
    createService: (data) => api.post('/admin/services', data).then(r => r.data),
    updateService: (id, data) => api.put(`/admin/services/${id}`, data).then(r => r.data),
    deleteService: (id) => api.delete(`/admin/services/${id}`).then(r => r.data),
    getCustomers: (params) => api.get('/admin/customers', { params }).then(r => r.data),
    getCustomerDetails: (id) => api.get(`/admin/customers/${id}`).then(r => r.data),
    getVehicles: (params) => api.get('/admin/vehicles', { params }).then(r => r.data),
    getPayments: (params) => api.get('/admin/payments', { params }).then(r => r.data),
    recordCODCollection: (paymentId) => api.patch(`/admin/payments/${paymentId}/collect`).then(r => r.data),
    getSchedule: () => api.get('/admin/schedule').then(r => r.data),
    updateSchedule: (data) => api.put('/admin/schedule', data).then(r => r.data),
    addBlockedPeriod: (data) => api.post('/admin/schedule/block', data).then(r => r.data),
    removeBlockedPeriod: (periodId) => api.delete(`/admin/schedule/block/${periodId}`).then(r => r.data),
    addHoliday: (data) => api.post('/admin/schedule/holiday', data).then(r => r.data),
    removeHoliday: (holidayId) => api.delete(`/admin/schedule/holiday/${holidayId}`).then(r => r.data),
  };
  export default adminService;
  ```
  - **Files:** `mobile/src/services/adminService.js`
  - **Verify:** `cd c:\Users\Dell\Desktop\PROWASH\mobile && node -e "const m = require('./src/services/adminService'); console.log(typeof m.adminService)"` — or simply confirm the file exists with no syntax errors via `npx expo export --dump-sourcemap` (too heavy); instead verify structurally with: `cd c:\Users\Dell\Desktop\PROWASH\mobile && node --input-type=module < src/services/adminService.js 2>&1 | head -5` (will fail on missing api import but show no parse errors).

- [ ] 6. **Enhance `AdminServicesScreen.js`**
  - Switch `getServices()` call to `adminService.getServices({ includeInactive: true })`.
  - Add vehicle-type filter chips (`All / Car / Bike / Scooty`) above the list; filter is local (client-side `useMemo` on the list).
  - Add a search `TextInput` with local filter on `service.name`.
  - Import `adminService` from `../../services/adminService`.
  - Remove import of `getServices` from `serviceService` (now going via adminService with includeInactive).
  - Keep all existing toggle/delete/edit logic unchanged.
  - **Files:** `mobile/src/screens/admin/AdminServicesScreen.js`
  - **Verify:** `cd c:\Users\Dell\Desktop\PROWASH\mobile && npx expo export --platform android 2>&1 | grep -i error` — or run Metro bundler and confirm no import errors.

- [ ] 7. **Complete `AddServiceScreen.js`**
  - Replace `import { createService } from '../../services/serviceService'` with `import adminService from '../../services/adminService'` and call `adminService.createService(data)`.
  - Expand `CATEGORIES` to: `['exterior', 'interior', 'full', 'premium', 'deep_clean', 'addon']`.
  - Add an `active` toggle (Switch) to the form, default `true`; include it in the payload.
  - Validation: name required, price > 0 (not just ≥ 0), duration > 0. Fix existing check `Number(form.price) < 0` → `Number(form.price) <= 0`.
  - **Files:** `mobile/src/screens/admin/AddServiceScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 8. **Complete `EditServiceScreen.js`**
  - Replace `import { updateService } from '../../services/serviceService'` with `import adminService` and call `adminService.updateService(service._id, data)`.
  - Expand `CATEGORIES` same as AddServiceScreen.
  - Add `active` toggle pre-filled from `service.isActive`, included in payload.
  - Same price > 0 validation fix.
  - **Files:** `mobile/src/screens/admin/EditServiceScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 9. **Complete `AdminCustomersScreen.js`**
  - Replace `api.get('/admin/customers', {params})` with `adminService.getCustomers({search, page, limit})`.
  - Show `totalBookings` count on each CustomerRow (currently missing — the API returns it from the aggregate).
  - Tap navigates to `AdminCustomerDetails` passing `customerId: item._id` (already does this).
  - Import `adminService` from `../../services/adminService`; remove `api` import if no longer needed.
  - **Files:** `mobile/src/screens/admin/AdminCustomersScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 10. **Complete `AdminCustomerDetailsScreen.js`**
  - Replace `api.get('/admin/customers/' + customerId)` with `adminService.getCustomerDetails(customerId)`.
  - The new API returns `{customer, stats:{total,completed,pending,cancelled}, vehicles, recentBookings}` — wire up:
    - Stats row with 4 boxes (Total/Completed/Pending/Cancelled).
    - Vehicles section: simple `FlatList` / mapped list rows (reg plate, make/model, type).
    - Recent bookings: `data.recentBookings.slice(0,5).map(b => <BookingCard booking={b} />)`.
  - Remove the toggle-active button and `ConfirmDialog` (admin customer toggling is out of scope for Phase 4, keep UI focused on view-only).
  - **Files:** `mobile/src/screens/admin/AdminCustomerDetailsScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 11. **Complete `AdminVehiclesScreen.js`**
  - Replace `api.get('/admin/vehicles')` with `adminService.getVehicles({type: activeType, search})`.
  - Add type filter chips: All / Car / Bike / Scooty (state: `activeType`). On chip change, re-fetch with new type param.
  - Server-side search by reg number (`?search=` passed to API); keep local filter as well for instant feedback.
  - The existing `VehicleRow` reads `vehicle.owner?.name` — the new API populates `vehicle.owner` with name/email/phone, so add an expandable detail row on tap showing owner email + phone (use a `useState expandedId`).
  - Remove `api` import.
  - **Files:** `mobile/src/screens/admin/AdminVehiclesScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 12. **Complete `AdminPaymentsScreen.js`**
  - Replace `import { getAdminPayments, updatePaymentStatus }` with `import adminService`.
  - Change method filter: add top-level tabs All / COD / Online (state: `activeMethod`).
  - Change status filter chips: All / Unpaid / Paid / Failed (remove Pending and Refunded from chips to match new statuses; keep them in the filter chip array if desired but at minimum add 'unpaid').
  - `PaymentRow` now reads `payment.bookingId?.bookingReference`, `payment.bookingId?.customerId?.name`, `payment.bookingId?.serviceNameSnapshot`, `payment.amount`, `payment.method`, `payment.status`, `payment.createdAt`.
  - For rows where `payment.method === 'cod' && payment.status === 'unpaid'`: show 'Record Collection' button → `ConfirmDialog` → `adminService.recordCODCollection(payment._id)` → optimistic update `status='paid'` + re-fetch.
  - Load: `adminService.getPayments({method: activeMethod, status: activeStatus, page})`.
  - **Files:** `mobile/src/screens/admin/AdminPaymentsScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 13. **Complete `AdminScheduleScreen.js`** (full replacement)
  - This file currently is a per-day viewer using `route.params.date`. Replace it entirely with a standalone business config screen.
  - No route params used. On mount: `adminService.getSchedule()`.
  - Structure as a `ScrollView` with `RefreshControl`. Six sections, each as a card:

  **Section 1 — Working Hours**
  - Two `TextInput`s: `openingTime` (HH:mm), `closingTime` (HH:mm).
  - Save button → `adminService.updateSchedule({openingTime, closingTime})` → Alert success/error.

  **Section 2 — Working Days**
  - Toggle chips for Mon/Tue/Wed/Thu/Fri/Sat/Sun (match `schedule.workingDays` array of full names: 'Monday' etc.).
  - Save button → `adminService.updateSchedule({workingDays})` → Alert.

  **Section 3 — Capacity**
  - Slot interval chips: 30 / 45 / 60 (number, not string).
  - `maxConcurrentBookings` `TextInput` (numeric).
  - Save button → `adminService.updateSchedule({slotIntervalMinutes, maxConcurrentBookings: Number(...)})`.

  **Section 4 — Breaks**
  - Mapped list of `schedule.breaks` with delete button (calls `updateSchedule` with breaks array minus deleted item).
  - Add form: `name`, `startTime` (HH:mm), `endTime` (HH:mm) + Add button → append to breaks array → `updateSchedule({breaks:[...existing, newBreak]})`.

  **Section 5 — Blocked Periods**
  - Mapped list of `schedule.blockedPeriods`: label, startAt, endAt. Delete → `adminService.removeBlockedPeriod(period._id)` → re-fetch schedule.
  - Add form: `label`, `startAt` (YYYY-MM-DDTHH:mm `TextInput`), `endAt` → `adminService.addBlockedPeriod(data)` → re-fetch.

  **Section 6 — Holidays**
  - Mapped list of `schedule.holidays`: date, label. Delete → `adminService.removeHoliday(holiday._id)` → re-fetch.
  - Add form: `date` (YYYY-MM-DD), `label` → `adminService.addHoliday(data)` → re-fetch.

  - All save actions set a per-section `saving` boolean and show `Alert.alert` on success/error.
  - **Files:** `mobile/src/screens/admin/AdminScheduleScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 14. **Complete `AdminReportsScreen.js`**
  - Replace `api.get('/admin/reports')` with `adminService.getReports()`.
  - Add a 2nd stat card for `completedBookings` and `cancelledBookings` (extract from `bookingsByStatus.completed` and `bookingsByStatus.cancelled`).
  - Add `recentBookings` FlatList at the bottom: `reports.recentBookings?.slice(0,10).map(b => <BookingCard key={b._id} booking={b} />)`.
  - Remove `api` import; import `adminService`.
  - Bar chart already present and working — keep it.
  - **Files:** `mobile/src/screens/admin/AdminReportsScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 15. **Complete `AdminCalendarScreen.js`** (standalone date-chip redesign)
  - Keep the existing calendar grid (month navigation + grid) — it already works as a standalone screen with no route params.
  - BUT also add a secondary "selected day bookings" panel below the calendar:
    - On day press, instead of navigating to `AdminSchedule`, call `adminService.getBookings({date: dateStr})` and show the list inline.
    - Render each booking as a row: time (formatTime), customer name, service name, `StatusBadge`.
    - Empty state 'No bookings this day' when empty.
  - Remove `navigation.navigate('AdminSchedule', ...)` call.
  - Import `adminService`; remove `getAdminBookings` import.
  - **Files:** `mobile/src/screens/admin/AdminCalendarScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 16. **Complete `AdminSettingsScreen.js`**
  - This screen is already complete (profile, change-password, logout, version). No structural changes needed.
  - Minor: ensure the `changePassword` call goes to `PATCH /api/auth/change-password` — check `authService.changePassword` target. If the authService uses `/auth/change-password`, it's fine; if it uses `/auth/password`, update the path to match the spec (`/api/auth/change-password`).
  - **Files:** `mobile/src/screens/admin/AdminSettingsScreen.js`, `mobile/src/services/authService.js` (verify endpoint path only)
  - **Verify:** Metro bundler, no import errors.

- [ ] 17. **Create `AdminMoreScreen.js`**
  - New file at `mobile/src/screens/admin/AdminMoreScreen.js`.
  - Dark-theme screen matching `AdminSettingsScreen` (`colors.midnight` safe area, `colors.cloud` scroll background).
  - Profile mini-card at top (avatar initials, name, email from `useAuth()`).
  - Menu rows (using the `MenuRow` pattern from `AdminSettingsScreen`):
    - 📅 Calendar → `navigation.navigate('AdminCalendar')`
    - 📋 Schedule → `navigation.navigate('AdminSchedule')`
    - 🚗 Vehicles → `navigation.navigate('AdminVehicles')`
    - 💳 Payments → `navigation.navigate('AdminPayments')`
    - 📊 Reports → `navigation.navigate('AdminReports')`
    - ⚙️ Settings → `navigation.navigate('AdminSettings')`
    - 🚪 Logout (danger row) → `ConfirmDialog` → `useAuth().logout()`
  - Use `Ionicons` icons (calendar-outline, clipboard-outline, car-outline, card-outline, bar-chart-outline, settings-outline, log-out-outline).
  - `AppHeader` title "More".
  - **Files:** `mobile/src/screens/admin/AdminMoreScreen.js`
  - **Verify:** Metro bundler, no import errors.

- [ ] 18. **Update `AdminNavigator.js`**
  - Import `AdminMoreScreen` from `../screens/admin/AdminMoreScreen`.
  - In `MoreStack`, change the root screen from `AdminSettings` to `AdminMore` (`component={AdminMoreScreen}`).
  - Keep all other screens nested in MoreStack: `AdminPayments`, `AdminCalendar`, `AdminSchedule`, `AdminReports`, `AdminSettings`.
  - MoreTab `tabBarLabel` stays `'More'`.
  - **Files:** `mobile/src/navigation/AdminNavigator.js`
  - **Verify:** Metro bundler, no import errors.

---

## Key Observations from Codebase

1. **Payment.js field names**: Current model uses `booking`/`customer` — Phase 4 renames to `bookingId`/`customerId`. The old `paymentController.js` uses `customer` field; after the model update, `getAllPayments` in `paymentController.js` will use stale field names, but since it's being replaced by the new `getPayments` in `adminController.js`, those old routes are dropped from `adminRoutes.js`.
2. **Schedule subdoc `_id`s**: `blockedPeriodSchema` and `holidaySchema` use `_id: false`, so `removeBlockedPeriod` and `removeHoliday` cannot pull by `_id`. The implementer must add `_id: true` (or remove `_id: false`) from those subdoc schemas in `Schedule.js` before writing the remove functions.
3. **Vehicle.owner vs customerId**: The Vehicle model uses `owner` (not `customerId`), but `getCustomerDetails` should query `Vehicle.find({owner: id})`.
4. **AdminCalendarScreen**: currently navigates to `AdminSchedule` on day press — this must be changed to inline booking load per item 15.
5. **AdminVehiclesScreen**: The existing `getAllVehicles` returns `items` not `vehicles` in the data key — the new `getAdminVehicles` should return `vehicles` to match mobile expectations.
6. **No test runner**: No Jest/Vitest configured. Verify steps use `node -e` for server imports and Metro bundler for mobile.
