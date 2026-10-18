# Phase 3 Implementation Plan — PROWASH

## Codebase Findings (pre-plan exploration)

| File | Current state | What Phase 3 needs |
|---|---|---|
| `server/src/models/Schedule.js` | Per-date slot model (date, maxBookings, bookedCount, slots[]) | Replace with single config-doc schema (timezone, workingDays, openingTime, slotIntervalMinutes, maxConcurrentBookings, breaks, blockedPeriods, holidays, isActive) |
| `server/src/models/Booking.js` | Minimal (customer/vehicle/service/scheduledDate/scheduledTime/totalAmount) | Full overhaul: bookingReference pre-save hook, rename fields to customerId/vehicleId/serviceId, add startAt/endAt, statusHistory, snapshot fields, paymentMethod/paymentStatus |
| `server/src/services/availabilityService.js` | Old slot-array implementation, no serviceId parameter | Complete rewrite: new algorithm against new Schedule model, IST timezone arithmetic, concurrent-booking count gate |
| `server/src/controllers/bookingController.js` | Uses old field names; no reschedule; no pagination; admin helpers inline | Rewrite all endpoints against new Booking schema; add rescheduleBooking; fix pagination; move admin endpoints to adminController |
| `server/src/controllers/adminController.js` | Only `getReports` | Add `getAdminBookings`, `updateBookingStatus`, `getDashboard`, expand `getAdminReports` |
| `server/src/controllers/availabilityController.js` | No serviceId param; setSchedule is per-date | Fix getAvailability to require serviceId; setSchedule stays as-is |
| `server/src/routes/bookingRoutes.js` | Missing reschedule route; admin helpers duplicated | Add PATCH reschedule, remove duplicated admin routes |
| `server/src/routes/adminRoutes.js` | Missing bookings CRUD | Wire getAdminBookings, updateBookingStatus from adminController |
| `server/scripts/seedServices.js` | Does not exist | Create: seeds default services + default Schedule config doc |
| `mobile/src/services/bookingService.js` | Missing getAvailableSlots (with serviceId), rescheduleBooking | Add both; fix cancelBooking to use PATCH |
| `mobile/src/screens/customer/BookWashScreen.js` | Only Step 1 (vehicle selection), no wizard | Full 5-step wizard rewrite |
| `mobile/src/screens/customer/BookingSuccessScreen.js` | Basic, no animation/countdown/copy | Add Animated checkmark, countdown, Clipboard copy |
| `mobile/src/screens/customer/BookingDetailsScreen.js` | No reschedule, no statusHistory, uses old field names | Add reschedule modal, statusHistory timeline, fix field names |
| `mobile/src/screens/customer/MyBookingsScreen.js` | Works but references old field names via BookingCard | Field name fix flows through; add "Upcoming" filter |
| `mobile/src/components/BookingCard.js` | References scheduledDate/scheduledTime | Update to use startAt |
| `mobile/src/navigation/CustomerNavigator.js` | BookingSuccess accessible but has back button | Set BookingSuccess as modal/noBack presentation |
| `mobile/src/screens/admin/AdminBookingDetailsScreen.js` | Shows all statuses, no transition rules | Show only valid next-transitions |

---

## Implementation Plan

- [ ] 1. **Rewrite `server/src/models/Schedule.js`** — replace the per-date-slot schema with the single-config-document schema required by the new availability engine.
      Remove slotSchema and scheduleSchema entirely. Define a new schema with: `timezone` (String, default 'Asia/Kolkata'), `workingDays` ([String], default ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']), `openingTime` (String, default '09:00'), `closingTime` (String, default '19:00'), `slotIntervalMinutes` (Number, default 30), `maxConcurrentBookings` (Number, default 3), `breaks` ([{name, startTime, endTime}], `_id:false`), `blockedPeriods` ([{label, startAt Date, endAt Date}], `_id:false`), `holidays` ([{date String, label String}], `_id:false`), `isActive` (Boolean, default true), timestamps:true.
      The model is still exported as `Schedule`.
      Files: `server/src/models/Schedule.js`
      Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node -e "import('./src/models/Schedule.js').then(m => console.log('Schedule OK:', Object.keys(m.default.schema.paths)))"` — prints the new field names without error.

- [ ] 2. **Rewrite `server/src/models/Booking.js`** — replace the minimal schema with the full Phase 3 schema.
      - Field renames: `customer` → `customerId` (ObjectId ref 'User', required, index), `vehicle` → `vehicleId` (ObjectId ref 'Vehicle', required), `service` → `serviceId` (ObjectId ref 'Service', required).
      - New fields: `bookingReference` (String, unique, sparse), `serviceNameSnapshot` (String, required), `priceAtBooking` (Number, required), `startAt` (Date, required, index), `endAt` (Date, required), `status` enum extended to include `'rejected'` and `'rescheduled'`, `paymentMethod` (enum ['cod','online'], required), `paymentStatus` (enum ['unpaid','pending','paid','failed','refunded'], default 'unpaid'), `notes` (String), `adminNotes` (String), `cancelledAt` (Date), `cancelledBy` (enum ['customer','admin']), `cancellationReason` (String), `statusHistory` ([{status String, changedAt Date, changedBy ObjectId, note String}], `_id:false`).
      - Remove: `scheduledDate`, `scheduledTime`, `totalAmount`, `cancelReason`.
      - Add pre-save hook: if `bookingReference` is not set, generate `'PW' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase()` using Node's built-in `crypto` (import `{ randomBytes } from 'crypto'`).
      - Keep indexes on `customerId`, `status`, `startAt`.
      Files: `server/src/models/Booking.js`
      Verify: `node -e "import('./src/models/Booking.js').then(m => console.log('Booking fields:', Object.keys(m.default.schema.paths)))"` — lists `bookingReference`, `startAt`, `customerId`, `statusHistory`, etc.

- [ ] 3. **Rewrite `server/src/services/availabilityService.js`** — implement the new `getAvailableSlots(serviceId, dateString)` function per the Phase 3 specification.
      **Algorithm (no external date libraries, pure JS Date arithmetic):**
      - Import `Schedule` from `../models/Schedule.js`, `Service` from `../models/Service.js`, `Booking` from `../models/Booking.js`.
      - Load active Schedule: `Schedule.findOne({ isActive: true })`. If none, create one with `{ isActive: true }` using `new Schedule({isActive:true}).save()`.
      - Load Service by serviceId; throw AppError 404 if not found.
      - Parse `dateString` (YYYY-MM-DD) to IST midnight: IST offset = +5h30m = 330 minutes. IST midnight as UTC = `new Date(year, month-1, day, 0, 0, 0)` treated as local — instead, compute directly: `const istMidnightUTC = new Date(Date.UTC(year, month-1, day) - 330 * 60000)`. **Wait — IST is UTC+5:30, so IST midnight = UTC 00:00 minus 5:30 = previous day UTC 18:30.** Correct formula: `istMidnightUTC = new Date(Date.UTC(year, month-1, day, 0, 0, 0) - 5.5 * 3600000)` which equals `new Date(Date.UTC(year, month-1, day) - 19800000)`.
      - Get day-of-week in IST from `istMidnightUTC`: use `istMidnightUTC.toLocaleString('en-US', {timeZone:'Asia/Kolkata', weekday:'long'})` to get the day name string (e.g. 'Monday'). Check against `schedule.workingDays`. Return `[]` if not a working day.
      - Check holidays: if `schedule.holidays.some(h => h.date === dateString)` return `[]`.
      - Helper `timeToMinutes(hhmm)`: splits on ':', returns `Number(hh)*60 + Number(mm)`.
      - Helper `istHHMMtoUTC(dateString, hhmm)`: parses `dateString` parts, builds `new Date(Date.UTC(year, month-1, day, hh, mm, 0) - 19800000)` — i.e., IST HH:MM on that date expressed as UTC.
      - Generate candidate slots: start at `openingTime`, step `slotIntervalMinutes` each iteration. Each slot: `startAt = istHHMMtoUTC(dateString, currentHHMM)`, `endAt = new Date(startAt.getTime() + service.duration * 60000)`. Include slot only if `endAt <= istHHMMtoUTC(dateString, schedule.closingTime)`. Enforce "at least 2 hours from now": `startAt.getTime() >= Date.now() + 2*3600000`.
      - Filter breaks: for each slot, skip if it overlaps any break — overlap when `slot.startAt < breakEnd && slot.endAt > breakStart` (where breakStart/End are computed via `istHHMMtoUTC`).
      - Filter blockedPeriods: skip slot if `slot.startAt < period.endAt && slot.endAt > period.startAt`.
      - For each remaining slot: `const count = await Booking.countDocuments({ startAt: { $lt: slotEnd }, endAt: { $gt: slotStart }, status: { $nin: ['cancelled','rejected'] } })`. Exclude if `count >= schedule.maxConcurrentBookings`.
      - Return `[{ startAt: slot.startAt.toISOString(), endAt: slot.endAt.toISOString() }]`.
      - Remove `updateSlotAvailability` export (no longer needed).
      Files: `server/src/services/availabilityService.js`
      Verify: After server is running with a seeded Schedule and Service, `curl "http://localhost:5000/api/availability?serviceId=<id>&date=<tomorrow>"` returns `{"success":true,"data":{"date":"...","serviceDurationMinutes":...,"availableSlots":[...]}}`.

- [ ] 4. **Rewrite `server/src/controllers/availabilityController.js`** — update `getAvailability` to the Phase 3 contract.
      - Import `Service` from `'../models/Service.js'` and `getAvailableSlots` from `'../services/availabilityService.js'`.
      - `getAvailability(req, res, next)`:
        1. Extract `serviceId` and `date` from `req.query`. Return 400 if either is missing.
        2. Validate `date` matches `/^\d{4}-\d{2}-\d{2}$/`.
        3. Validate date is today or future in IST: compute IST today string via `new Date(Date.now() + 19800000).toISOString().slice(0,10)` and compare.
        4. Call `getAvailableSlots(serviceId, date)` — this loads the service internally.
        5. Load service for `durationMinutes` field to include in response.
        6. Return `{ success: true, data: { date, serviceDurationMinutes: service.duration, availableSlots } }`.
      - Keep `setSchedule` unchanged (admin convenience endpoint).
      Files: `server/src/controllers/availabilityController.js`
      Verify: `GET /api/availability?serviceId=X&date=2099-01-01` returns valid response shape; `GET /api/availability?date=2099-01-01` (missing serviceId) returns 400.

- [ ] 5. **Rewrite `server/src/controllers/bookingController.js`** — implement all five customer endpoints and remove inline admin endpoints (they move to adminController).
      **All endpoints use new Booking field names (`customerId`, `vehicleId`, `serviceId`, `startAt`, `endAt`, `priceAtBooking`, `serviceNameSnapshot`).**

      `createBooking (POST /api/bookings)`:
      1. Destructure `{ vehicleId, serviceId, startAt, paymentMethod, notes }` from `req.body`.
      2. Validate required fields; return 400 if any missing.
      3. Validate `paymentMethod` is 'cod' or 'online'.
      4. Load Vehicle; verify `vehicle.owner.toString() === req.user._id.toString()`, else 403.
      5. Load Service (isActive must be true), else 404.
      6. Compute `endAt = new Date(new Date(startAt).getTime() + service.duration * 60000)`.
      7. Server-side availability re-check: call `getAvailableSlots(serviceId, dateString)` where dateString is the YYYY-MM-DD part of startAt in IST (`new Date(new Date(startAt).getTime() + 19800000).toISOString().slice(0,10)`). Check that the returned slots array contains an entry with `slot.startAt === new Date(startAt).toISOString()`. If not found, return 409 with `{ success: false, message: 'Slot no longer available', alternatives: slots.slice(0,3) }`.
      8. Create Booking with `customerId=req.user._id`, `vehicleId`, `serviceId`, `serviceNameSnapshot=service.name`, `priceAtBooking=service.price`, `startAt`, `endAt`, `paymentMethod`, `notes`, `status='pending'`, `statusHistory=[{status:'pending', changedAt:new Date(), changedBy:req.user._id}]`.
      9. Create Payment: `{ booking: booking._id, customer: req.user._id, amount: service.price, method: paymentMethod === 'online' ? 'razorpay' : 'cod' }`.
      10. Create Notification via `Notification.create({ user: req.user._id, title: 'Booking Received', body: \`Your ${service.name} appointment is pending confirmation.\`, type: 'booking', data: { bookingId: booking._id } })`.
      11. Populate and return `{ success: true, data: booking }` with status 201. Populate: `customerId` → name/email/phone, `vehicleId` → registrationNumber/make/model/vehicleType (use `.populate('vehicleId', 'make model licensePlate type')`), `serviceId` → name/category.

      `getMyBookings (GET /api/bookings/my)`:
      - Filter `{ customerId: req.user._id }`, plus optional `?status=` filter.
      - Populate `vehicleId` (make model licensePlate type) and `serviceId` (name category).
      - Sort `startAt: -1`. Paginate: `page` default 1, `limit` default 20 (max 50).
      - Return `{ success: true, data: { bookings, total, page, pages } }`.

      `getBookingById (GET /api/bookings/:id)`:
      - Find by id. Return 404 if not found.
      - Allow if `req.user.role === 'admin'` OR `booking.customerId.toString() === req.user._id.toString()`. Else 403.
      - Populate `vehicleId` (full vehicle fields) and `serviceId` (full service fields).
      - Return `{ success: true, data: booking }`.

      `cancelBooking (PATCH /api/bookings/:id/cancel)`:
      - Verify `customerId === req.user._id`.
      - Status must be 'pending' or 'confirmed', else 400.
      - `cancellationReason` from `req.body.reason || req.body.cancellationReason`; required.
      - Update: `status='cancelled', cancelledAt=new Date(), cancelledBy='customer', cancellationReason`.
      - Push to `statusHistory`: `{ status:'cancelled', changedAt: new Date(), changedBy: req.user._id, note: cancellationReason }`.
      - Create cancellation Notification.
      - Return updated booking.

      `rescheduleBooking (PATCH /api/bookings/:id/reschedule)`:
      - Verify ownership; status must be 'pending' or 'confirmed'.
      - Require `newStartAt` in body.
      - Compute new `endAt`; re-run availability check (same as createBooking step 7 but for new slot).
      - Update `startAt, endAt, status='rescheduled'`.
      - Push to statusHistory.
      - Return updated booking.

      Remove `getAllBookings` and `updateBookingStatus` exports from this file (they move to adminController). Update import in `bookingRoutes.js` accordingly.
      Files: `server/src/controllers/bookingController.js`
      Verify: All five routes described in item 7 respond correctly. Run the verification curl commands from Phase 3 scope section D.

- [ ] 6. **Update `server/src/middleware/validate.js`** — update `bookingRules` to validate the new field names and add `rescheduleRules`.
      - Replace `bookingRules`: validate `vehicleId` (notEmpty), `serviceId` (notEmpty), `startAt` (notEmpty, isISO8601), `paymentMethod` (notEmpty, isIn(['cod','online'])).
      - Add `rescheduleRules`: validate `newStartAt` (notEmpty, isISO8601).
      Files: `server/src/middleware/validate.js`
      Verify: `POST /api/bookings` with missing `startAt` returns 400 with field-level error `{ field: 'startAt', message: '...' }`.

- [ ] 7. **Update `server/src/routes/bookingRoutes.js`** — wire all five new endpoints with correct middleware; remove admin routes that moved.
      - `POST /` → `protect, validate(bookingRules), createBooking`
      - `GET /my` → `protect, getMyBookings`
      - `GET /:id` → `protect, getBookingById`
      - `PATCH /:id/cancel` → `protect, cancelBooking`  (method changed from PUT to PATCH)
      - `PATCH /:id/reschedule` → `protect, validate(rescheduleRules), rescheduleBooking`
      - Remove the `GET /admin/bookings` and `PUT /admin/bookings/:id/status` lines (they live in adminRoutes now).
      - Import `rescheduleRules` from validate.js; import `rescheduleBooking` from bookingController.
      Files: `server/src/routes/bookingRoutes.js`
      Verify: `node -e "import('./src/routes/bookingRoutes.js').then(() => console.log('routes OK'))"` runs without error (from server/src).

- [ ] 8. **Update `server/src/controllers/adminController.js`** — add `getAdminBookings`, `updateBookingStatus`, `getDashboard`; expand `getAdminReports`.

      `getAdminBookings (GET /api/admin/bookings)`:
      - Build filter from query: `?status=` → `filter.status`; `?date=` (YYYY-MM-DD) → `filter.startAt = {$gte: dayStart, $lt: dayEnd}` in UTC; `?vehicleType=` → join via Vehicle subquery (find vehicleIds of that type, add `filter.vehicleId = {$in: ids}`); `?search=` → `$or: [{ bookingReference: regex }, customer name regex (requires joining)]` — for search, use `$or` on bookingReference only if pipeline is too complex; for customer name search, load matching User._ids first then add `filter.customerId: {$in: ids}`.
      - Populate `customerId` (name email phone), `vehicleId` (make model licensePlate type), `serviceId` (name category price).
      - Sort `startAt: -1`. Paginate (page/limit default 20, max 50).
      - Return `{ success: true, data: { bookings, total, page, pages } }`.

      `updateBookingStatus (PATCH /api/admin/bookings/:id/status)`:
      - Valid transitions map:
        ```
        pending   → ['confirmed', 'rejected', 'cancelled']
        confirmed → ['in_progress', 'cancelled', 'rescheduled']
        in_progress → ['completed']
        completed / cancelled / rejected → [] (terminal)
        ```
      - Load booking. If `allowedNext[booking.status]` does not include `req.body.status`, return 400 with message listing valid transitions.
      - Update status; push to statusHistory with `changedBy: req.admin._id` (use `req.user._id`).
      - Create Notification to customer.
      - Return updated booking.

      `getDashboard (GET /api/admin/dashboard)`:
      - Return: totalBookings, pendingBookings, todayAppointments (startAt in today IST range), totalRevenue (sum priceAtBooking where status='completed'), activeServices count, totalCustomers.
      - Keep simple aggregation; no complex joins.

      `getAdminReports (GET /api/admin/reports)` — expand existing `getReports`:
      - totalCustomers, totalBookings, totalRevenue (sum `priceAtBooking` where status='completed' — from Booking, not Payment), bookingsByStatus (aggregate over Booking.status), todayAppointments, thisMonthRevenue, recentBookings (last 10, populated).
      - Rename export from `getReports` to `getAdminReports`; keep backward compat by also exporting as `getReports`.
      Files: `server/src/controllers/adminController.js`
      Verify: `GET /api/admin/bookings` (with admin JWT) returns paginated list; `PATCH /api/admin/bookings/:id/status` with invalid transition returns 400.

- [ ] 9. **Update `server/src/routes/adminRoutes.js`** — wire admin booking endpoints and dashboard.
      - Import `getAdminBookings`, `updateBookingStatus`, `getDashboard`, `getAdminReports` from `'../controllers/adminController.js'`.
      - Remove `getAllBookings`, `getBooking`, `updateBookingStatus` imports from bookingController (those routes already exist but pointed at wrong controller).
      - Add: `GET /dashboard → protect, requireAdmin, getDashboard`
      - Fix: `GET /bookings → protect, requireAdmin, getAdminBookings`
      - Fix: `GET /bookings/:id → protect, requireAdmin, getBookingById` (import from bookingController — this one is shared and checks req.user.role)
      - Fix: `PUT /bookings/:id/status` → change to `PATCH` and use `updateBookingStatus` from adminController.
      - Fix: `GET /reports` → use `getAdminReports`.
      Files: `server/src/routes/adminRoutes.js`
      Verify: `GET /api/admin/dashboard` returns dashboard data shape.

- [ ] 10. **Create `server/scripts/seedServices.js`** — seed default services AND a default Schedule config document.
       Pattern: follow `server/scripts/seedAdmin.js` (imports 'dotenv/config', connectDB, models; calls process.exit).
       - Connect to DB.
       - Seed Schedule: `Schedule.findOne({ isActive: true })` → if none, create with all defaults (no extra fields; just `{ isActive: true }` which triggers schema defaults for workingDays, openingTime, etc.).
       - Seed Services: define an array of 6 services covering car/bike across exterior/interior/full/premium categories with realistic prices and durations. Check `Service.countDocuments()` — skip if any exist. Use `Service.insertMany(servicesArray)`.
       - Log results and `process.exit(0)`.
       Files: `server/scripts/seedServices.js`
       Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node scripts/seedServices.js` — logs "Schedule seeded" and "Services seeded" (or "already exist") and exits 0.

- [ ] 11. **Update `mobile/src/services/bookingService.js`** — rewrite as a named-export object matching the Phase 3 contract.
       Export a `bookingService` object (and keep named function exports for backward compat):
       ```js
       export const bookingService = {
         async getAvailableSlots(serviceId, date),   // GET /api/availability?serviceId=&date=
         async createBooking(data),                   // POST /api/bookings
         async getMyBookings(params = {}),            // GET /api/bookings/my?status=&page=&limit=
         async getBookingById(id),                    // GET /api/bookings/:id
         async cancelBooking(id, reason),             // PATCH /api/bookings/:id/cancel  { reason }
         async rescheduleBooking(id, newStartAt),     // PATCH /api/bookings/:id/reschedule  { newStartAt }
       };
       ```
       Also keep the existing standalone named exports (`createBooking`, `getMyBookings`, etc.) calling through to the object methods, so existing screens that `import * as bookingService` still work.
       Fix `cancelBooking` method: change from `api.put(...)` to `api.patch(...)` with body `{ reason }`.
       Add `getAdminBookings` and `updateBookingStatus` named exports for admin screens (these already exist; just ensure `updateBookingStatus` uses `api.patch(...)` matching the new route method).
       Files: `mobile/src/services/bookingService.js`
       Verify: No runtime import errors when the app loads (checked via `npx expo export`).

- [ ] 12. **Update `mobile/src/components/BookingCard.js`** — adapt to new Booking schema field names.
       The card currently references `scheduledDate`, `scheduledTime`, `totalAmount`. Change to `startAt`, `priceAtBooking`. Format `startAt` (ISO string) to a date string and extract time component:
       ```js
       const startDate = booking.startAt ? new Date(booking.startAt) : null;
       // Format date: startDate.toLocaleDateString(...)
       // Format time: startDate.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})
       ```
       Also add `bookingReference` display: show `booking.bookingReference || '#' + booking._id.slice(-8).toUpperCase()` in a small label.
       Amount display: use `booking.priceAtBooking ?? booking.totalAmount` to handle old records gracefully.
       Files: `mobile/src/components/BookingCard.js`
       Verify: BookingCard renders correctly in Expo without undefined prop warnings.

- [ ] 13. **Rewrite `mobile/src/screens/customer/BookWashScreen.js`** — full 5-step wizard in a single file with internal state.
       **Architecture decision:** single file with `step` state (0–4) and `wizardData` object accumulating selections. No external state management; everything stays in component state. Uses `useCallback`/`useMemo` for perf.

       **Step 0 — Vehicle type selection:**
       - Show 3 large cards for Car / Bike / Scooty (icons: `car-outline`, `bicycle-outline`, `bicycle-outline`). On tap → set `wizardData.vehicleType`, advance to step 1.

       **Step 1 — Vehicle selection:**
       - Load `GET /api/vehicles/my` (vehicleService.getMyVehicles) on mount; filter by `vehicleType === wizardData.vehicleType`.
       - Show selectable VehicleCards. "Add New Vehicle" button navigates to `HomeTab → AddVehicle`.
       - Continue button → step 2.

       **Step 2 — Service selection:**
       - Load `GET /api/services?vehicleType=<wizardData.vehicleType>` on mount (call serviceService.getServices with params if the service supports it, or client-filter the full list by `service.vehicleTypes.includes(wizardData.vehicleType)`).
       - Show selectable ServiceCards (tap to select, re-tap deselects). Continue → step 3.

       **Step 3 — Date + time slot:**
       - Render next 14 days as a horizontal FlatList of date chip buttons. Active chip highlighted in `colors.ocean`. On chip select → fetch `bookingService.getAvailableSlots(serviceId, dateString)`.
       - Render slot grid: each slot is a chip showing formatted time (extracted from `slot.startAt`). Loading spinner, empty state, error state.
       - Slot chip: extract HH:MM from `new Date(slot.startAt).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true})`.
       - Continue → step 4.

       **Step 4 — Review + confirm:**
       - Show summary card: vehicle, service (name + price), date+time.
       - Notes TextInput (optional).
       - Payment method selector: two chips — 'Cash on Delivery' (cod) and 'Pay Online' (online). Default: 'cod'.
       - "Confirm Booking" button: disabled while submitting. On press: call `bookingService.createBooking({ vehicleId, serviceId, startAt: selectedSlot.startAt, paymentMethod, notes })`.
       - On success: navigate to `BookingSuccess` with params `{ booking: result.data }`.
       - On 409: show inline error text under the button with a "Pick Another Time" button that jumps back to step 3.
       - On other error: show Alert.

       **Progress indicator:** a 5-dot row at the top (or step bar). Active dot filled `colors.ocean`, inactive `colors.border`.
       **Back button:** `navigation.goBack()` on step 0; `setStep(s => s-1)` on steps 1–4. Use Android hardware back via `useFocusEffect` + `BackHandler`.
       Files: `mobile/src/screens/customer/BookWashScreen.js`
       Verify: Screen renders without crashing; navigating through all 5 steps and tapping Confirm calls the bookings API.

- [ ] 14. **Rewrite `mobile/src/screens/customer/BookingSuccessScreen.js`** — complete the success screen per spec.
       - Animated green checkmark: use `Animated.spring` to scale from 0 to 1 on mount. Icon: `Ionicons name="checkmark-circle"` size 80 `color={colors.success}`, wrapped in `Animated.View`.
       - Extract booking data from `route.params.booking` (the full booking object from createBooking response).
       - Show: bookingReference (bold, with Clipboard copy on long-press — `import * as Clipboard from 'expo-clipboard'`; show brief "Copied!" toast using a state flag + setTimeout).
       - Vehicle summary: `${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`.
       - Service + formatted startAt datetime.
       - Payment method note: "Cash on Delivery — pay at appointment" or "Online payment required".
       - Buttons: "View Booking Details" → navigate to `BookingsTab` > `BookingDetails` with `{ bookingId: booking._id }`. "Go to Home" → `HomeTab`.
       - 10-second countdown auto-navigate to HomeTab: use `useRef` for interval, `useState` for countdown. Show "Redirecting to Home in Xs…" text. Clear interval on unmount and on manual navigation.
       - Remove back gesture: set `navigation.setOptions({ gestureEnabled: false })` in `useEffect`.
       Files: `mobile/src/screens/customer/BookingSuccessScreen.js`
       Verify: Screen renders without crashing after booking; countdown text decrements; bookingReference Clipboard copy works.

- [ ] 15. **Update `mobile/src/screens/customer/BookingDetailsScreen.js`** — add reschedule functionality and statusHistory timeline; fix field names.
       **Field name fixes:** replace `booking.scheduledDate` → `booking.startAt`, `booking.scheduledTime` (derive from `new Date(booking.startAt)`), `booking.totalAmount` → `booking.priceAtBooking`, `booking.customer` → `booking.customerId`.
       **Add bookingReference header:** show `booking.bookingReference` prominently.
       **Reschedule modal:** add a state `showRescheduleModal` (boolean). When opened, show a date-chip row (next 14 days) + slot grid (same as BookWashScreen step 3 logic) inside a Modal. On confirm: call `bookingService.rescheduleBooking(bookingId, newStartAt)`, close modal, reload booking.
       **StatusHistory timeline:** add a section below the details card. Map over `booking.statusHistory` (if present). Each entry: colored dot + status name + formatted date. Use `colors.ocean` for confirmed/in_progress, `colors.success` for completed, `colors.error` for cancelled/rejected, `colors.warning` for pending.
       **Conditional actions:** keep existing cancel section. Add reschedule button alongside cancel when status is 'pending' or 'confirmed'. Keep ConfirmDialog for cancel.
       Files: `mobile/src/screens/customer/BookingDetailsScreen.js`
       Verify: Booking details screen loads real booking data and shows statusHistory entries.

- [ ] 16. **Update `mobile/src/screens/customer/MyBookingsScreen.js`** — add "Upcoming" filter and fix data response shape.
       - Add `{ label: 'Upcoming', value: 'upcoming' }` to `STATUS_FILTERS` list (between All and Pending).
       - Handle `upcoming` filter client-side: filter bookings where `['pending','confirmed','in_progress'].includes(b.status) && new Date(b.startAt) >= new Date()`.
       - Fix data fetch: `bookingService.getMyBookings()` now returns `{ data: { bookings, total, page, pages } }` — update destructure to `data.data?.bookings || data.bookings || data.data || []`.
       - Pass `?status=` query param for non-upcoming server-side filters: call `bookingService.bookingService.getMyBookings({ status: activeFilter !== 'all' && activeFilter !== 'upcoming' ? activeFilter : undefined })`.
       Files: `mobile/src/screens/customer/MyBookingsScreen.js`
       Verify: Tabs render; "Upcoming" shows only future non-cancelled bookings; pull-to-refresh works.

- [ ] 17. **Update `mobile/src/screens/customer/CustomerHomeScreen.js`** — ensure "Book Now" CTA navigates to BookWashScreen.
       The current `heroCard` `onPress` navigates to `'ServicesTab'`. Change to navigate directly to `BookWashScreen`:
       ```js
       onPress={() => navigation.navigate('ServicesTab', { screen: 'BookWash' })}
       ```
       Also fix `bookingService.getMyBookings()` data shape: `b.bookings || b.data?.bookings || b.data || []`.
       Files: `mobile/src/screens/customer/CustomerHomeScreen.js`
       Verify: Tapping "Book a Wash" hero card opens the BookWashScreen step 0.

- [ ] 18. **Update `mobile/src/navigation/CustomerNavigator.js`** — ensure BookingSuccess has no back button.
       In `ServicesStack`, add `options` to `BookingSuccess` screen:
       ```js
       <Stack.Screen
         name="BookingSuccess"
         component={BookingSuccessScreen}
         options={{ gestureEnabled: false, headerBackVisible: false }}
       />
       ```
       No other structural changes needed — all booking-flow screens are already registered in ServicesStack and BookingsStack.
       Files: `mobile/src/navigation/CustomerNavigator.js`
       Verify: After booking success, Android back button does not navigate back to payment/review.

- [ ] 19. **Update `mobile/src/screens/admin/AdminBookingDetailsScreen.js`** — show only valid status transitions.
       Define the transitions map (matching adminController):
       ```js
       const VALID_TRANSITIONS = {
         pending:    ['confirmed', 'rejected', 'cancelled'],
         confirmed:  ['in_progress', 'cancelled'],
         in_progress: ['completed'],
         completed:  [],
         cancelled:  [],
         rejected:   [],
         rescheduled: ['confirmed', 'cancelled'],
       };
       ```
       Filter `STATUS_OPTIONS` to only show statuses in `VALID_TRANSITIONS[booking.status]`. If empty (terminal), show a "No further updates available" label instead of the status chip grid.
       Fix `updateBookingStatus` API call: change from `api.put(...)` to `api.patch(...)` via `bookingService.updateBookingStatus` (already exported).
       Also fix the booking load: the `GET /api/admin/bookings/:id` route uses `getBookingById` from bookingController which checks `req.user.role === 'admin'` — this already works. Remove the fallback list-and-find code (it was a workaround for a missing endpoint).
       Files: `mobile/src/screens/admin/AdminBookingDetailsScreen.js`
       Verify: Admin can only see valid next-status buttons; completed/cancelled bookings show no update options.

- [ ] 20. **Update `mobile/src/screens/admin/AdminBookingsScreen.js`** — minor: add "Rejected" to STATUS_FILTERS.
       Add `{ label: 'Rejected', value: 'rejected' }` to the `STATUS_FILTERS` array (after Cancelled).
       No other changes needed — the screen already has pull-to-refresh, FlatList, and error handling.
       Files: `mobile/src/screens/admin/AdminBookingsScreen.js`
       Verify: Admin bookings screen renders; filter tabs include Rejected.

- [ ] 21. **Update `mobile/src/constants/index.js`** — extend BOOKING_STATUS with new values.
       Add:
       ```js
       export const BOOKING_STATUS = {
         ...existing values...
         REJECTED: 'rejected',
         RESCHEDULED: 'rescheduled',
       };
       ```
       Files: `mobile/src/constants/index.js`
       Verify: No import errors.

- [ ] 22. **Verification — backend** (run after items 1–10 are complete):
       ```
       cd c:\Users\Dell\Desktop\PROWASH\server
       node scripts/seedServices.js
       ```
       Expected: logs "Schedule seeded (or already exists)" and "Services seeded: 6 services created".
       Then start the server (`node src/server.js`) and run:
       - `GET http://localhost:5000/api/availability?serviceId=<seededServiceId>&date=<tomorrow>` → returns `{ success: true, data: { date, serviceDurationMinutes, availableSlots: [...] } }` with at least 1 slot.
       - `POST http://localhost:5000/api/bookings` (with customer JWT, valid vehicleId/serviceId/startAt/paymentMethod) → returns 201 with `bookingReference` field.
       - `GET http://localhost:5000/api/bookings/my` → returns `{ data: { bookings: [...], total, page, pages } }`.
       - `PATCH http://localhost:5000/api/bookings/:id/cancel` with `{ reason: "test" }` → returns updated booking with `status: 'cancelled'`.
       - `GET http://localhost:5000/api/admin/bookings` (with admin JWT) → returns paginated list.
       - `PATCH http://localhost:5000/api/admin/bookings/:id/status` with `{ status: 'confirmed' }` → returns updated booking.

- [ ] 23. **Verification — mobile** (run after items 11–21 are complete):
       ```
       cd c:\Users\Dell\Desktop\PROWASH\mobile
       npx expo export --platform android
       ```
       Expected: export completes with 0 errors. Any TypeScript/JS compilation errors indicate a broken import or undefined reference that must be fixed before proceeding. Report exact output including any warnings about missing modules or undefined variables.

---

## File-by-File Summary

| File | Action | Key pattern to follow |
|---|---|---|
| `server/src/models/Schedule.js` | Full rewrite | New config-doc schema; no per-date documents |
| `server/src/models/Booking.js` | Full rewrite | crypto pre-save hook; statusHistory sub-doc array |
| `server/src/services/availabilityService.js` | Full rewrite | IST via UTC offset math; no external date libs |
| `server/src/controllers/availabilityController.js` | Update getAvailability signature | Existing setSchedule pattern for error handling |
| `server/src/controllers/bookingController.js` | Full rewrite (5 endpoints) | AppError pattern from existing file; Notification.create pattern |
| `server/src/controllers/adminController.js` | Add 3 endpoints, expand reports | Existing getReports aggregation pattern |
| `server/src/middleware/validate.js` | Update bookingRules, add rescheduleRules | Existing rule arrays pattern |
| `server/src/routes/bookingRoutes.js` | Update routes, change PUT→PATCH, add reschedule | Existing Router pattern |
| `server/src/routes/adminRoutes.js` | Re-wire bookings to adminController | Existing protect+requireAdmin pattern |
| `server/scripts/seedServices.js` | Create new | Follow seedAdmin.js pattern exactly |
| `mobile/src/services/bookingService.js` | Add getAvailableSlots, rescheduleBooking; fix PATCH | Existing api.get/post/patch pattern |
| `mobile/src/components/BookingCard.js` | Field names startAt/priceAtBooking | Existing component style |
| `mobile/src/screens/customer/BookWashScreen.js` | Full rewrite — 5-step wizard | VehicleCard/ServiceCard selection pattern from existing screens |
| `mobile/src/screens/customer/BookingSuccessScreen.js` | Rewrite with animation + countdown | Animated.spring from React Native core |
| `mobile/src/screens/customer/BookingDetailsScreen.js` | Add reschedule modal + statusHistory | ConfirmDialog pattern already present |
| `mobile/src/screens/customer/MyBookingsScreen.js` | Add Upcoming filter, fix data shape | Existing FlatList + filter pattern |
| `mobile/src/screens/customer/CustomerHomeScreen.js` | Fix hero CTA nav target | navigation.navigate pattern |
| `mobile/src/navigation/CustomerNavigator.js` | Add gestureEnabled:false to BookingSuccess | Existing Stack.Screen options pattern |
| `mobile/src/screens/admin/AdminBookingDetailsScreen.js` | Filter to valid transitions only | VALID_TRANSITIONS map |
| `mobile/src/screens/admin/AdminBookingsScreen.js` | Add Rejected filter tab | Existing STATUS_FILTERS array |
| `mobile/src/constants/index.js` | Add REJECTED, RESCHEDULED to BOOKING_STATUS | Existing const pattern |

---

## Important Notes for Implementer

1. **Field name migration:** Old Booking fields (`customer`, `vehicle`, `service`, `scheduledDate`, `scheduledTime`, `totalAmount`, `cancelReason`) are replaced by new names. Any existing data in MongoDB will not match the new schema — this is expected for a development environment. If preserving data is needed, a migration script would be required (out of scope for Phase 3).

2. **Schedule model is a singleton config doc:** The new Schedule model is NOT per-date. There is one active document that holds the business configuration. `seedServices.js` creates it. The availability service loads it on every request (consider adding lean() for perf).

3. **No external date libraries:** The availability service must use only built-in `Date` arithmetic. The IST offset is hardcoded as 19800000 milliseconds (5.5 hours × 3600000).

4. **BookWashScreen replaces the old multi-screen flow** (BookWashScreen → SelectDateTimeScreen → BookingReviewScreen → PaymentScreen) for the "Book Now" entry point. The individual screens remain registered in the navigator for backward compatibility but the new BookWashScreen is a self-contained wizard.

5. **Payment model compatibility:** The Payment model uses `method: 'cod' | 'razorpay'` while the new Booking uses `paymentMethod: 'cod' | 'online'`. When creating Payment records from createBooking, map `'online' → 'razorpay'`.

6. **`expo-clipboard` dependency:** BookingSuccessScreen uses `expo-clipboard` for the Clipboard copy feature. Verify it is installed in the mobile project: `cat mobile/package.json | grep clipboard`. If missing, add it with `cd mobile && npx expo install expo-clipboard`.
