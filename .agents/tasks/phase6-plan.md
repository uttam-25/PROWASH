# Phase 6 — Implementation Plan

> **Codebase state at plan time:**
> - `colors.js` already has `colors.black` and `colors.white` — no change needed.
> - `SplashScreen.js` uses `navigation.replace('AdminHome')` and `navigation.replace('CustomerHome')` — both match registered names in `RootNavigator.js` exactly — no change needed.
> - `AppInput.js` password toggle is fully functional — `setSecure((s) => !s)` works correctly — no change needed.
> - `ConfirmDialog.js` renders with `rgba(0,0,0,0.55)` backdrop and uses nested `Pressable` to block touch propagation — no change needed.
> - `BookingSuccessScreen.js` countdown `useEffect` **already returns `clearInterval(interval)`** — BUG 1 is already fixed. No change needed.
> - `ALLOWED_TRANSITIONS` in `adminController.js` already includes `'rescheduled'` in `confirmed`'s next states — BUG 4 is already fixed. No change needed.
> - `app.js` mounts all 8 distinct route groups with no duplicates; `GET /api/health` is present.
> - `server/package.json` is missing the `seed:services` script.
> - `AdminReportsScreen.js` uses `reports?.todayBookings` but the backend returns `todayAppointments` — field name mismatch to fix in Section C.

---

## SECTION A — Bug Fixes

- [ ] 1. **BUG 2 — CustomerHomeScreen.js: fetch services and vehicles once on mount, only re-fetch bookings on focus**

  Currently `useFocusEffect` calls `loadData()` which refetches vehicles, bookings, and services every time the screen focuses. Split into two separate fetches: a one-time mount fetch for vehicles+services, and a focus-triggered fetch for bookings only. The notification badge unread-count fetch stays on focus.

  **What to do:**

  1. Add a `useEffect` that fires once on mount (empty dep array) to fetch vehicles and services, then sets `loading = false`.
  2. Keep `useFocusEffect` but replace its body with a narrower `loadBookings` callback that only calls `bookingService.getMyBookings()` and updates `bookings` state. It must **not** set `loading = true` (the initial load already handled that).
  3. The notification unread-count fetch stays inside `useFocusEffect` unchanged.
  4. Remove `loadData` (the combined function) entirely to avoid confusion — or keep it only for the pull-to-refresh `handleRefresh` path. For refresh: re-run all three fetches so the user gets fully fresh data.

  **Files:** `mobile/src/screens/customer/CustomerHomeScreen.js`

  **Verify:** Start the Expo dev server (`npx expo start --no-dev`). Navigate away from Home and back — the network log should show only the bookings call on re-focus, not the vehicles or services calls. Pull-to-refresh should still fetch all three.

---

- [ ] 2. **BUG 3 — availabilityService.js: replace ICU-dependent `toLocaleString` with static array lookup**

  The current `getISTDayName` calls `toLocaleString` with `timeZone: 'Asia/Kolkata'`, which requires full ICU data — unavailable in many Node.js Docker/minimal deployments. Replace with arithmetic on UTC offset.

  **What to do:** Replace the entire `getISTDayName` function body (lines that use `istNoon.toLocaleString`) with:

  ```js
  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function getISTDayName(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    // Use UTC noon of that date shifted by IST offset — safe cross-midnight
    const utcNoon = new Date(Date.UTC(year, month - 1, day, 6, 30, 0)); // noon IST
    const istDate = new Date(utcNoon.getTime() + istOffsetMs);
    return DAY_NAMES[istDate.getUTCDay()];
  }
  ```

  Remove the old `const istNoon` line and the `istNoon.toLocaleString` return line. The function signature stays the same — it still accepts `dateString` and returns a day name string.

  **Files:** `server/src/services/availabilityService.js`

  **Verify:** `node --check server/src/services/availabilityService.js` passes with no output. Then run: `node -e "import('./server/src/services/availabilityService.js').then(m => console.log('ok'))"` — no error.

---

- [ ] 3. **BUG 5 — paymentController.js: graceful 200 when webhook secret is not configured**

  Currently when `RAZORPAY_WEBHOOK_SECRET` and `RAZORPAY_KEY_SECRET` are both unset, `secret` is `undefined`. The HMAC still runs with `''`, which likely returns a different signature from `undefined`, triggering a 400 response. Razorpay will then retry the webhook indefinitely. Add an early-exit guard.

  **What to do:** At the very start of `handleWebhook`, before the HMAC computation, add:

  ```js
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!webhookSecret) {
    return res.status(200).json({ received: true });
  }
  ```

  Then replace the existing `const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;` line (which comes just after) with `const secret = webhookSecret;` — or inline `webhookSecret` where `secret` was used, eliminating the redundant variable.

  **Files:** `server/src/controllers/paymentController.js`

  **Verify:** `node --check server/src/controllers/paymentController.js` passes. Smoke test (Section H step 17) confirms `/api/health` returns 200.

---

- [ ] 4. **BUG 6 — adminController.js: guard notifyPaymentConfirmed when booking lookup returns null**

  `recordCODCollection` already does `const booking = await Booking.findByIdAndUpdate(...)` and then checks `if (booking)` before calling `notifyPaymentConfirmed` — so BUG 6 is **partially** handled. The plan task is complete, but a subtle gap exists: `payment.bookingId` may be a populated ObjectId that does not match any booking (orphaned payment). Confirm the existing guard is sufficient and add a defensive `payment.bookingId` existence check before the `findByIdAndUpdate` call.

  **What to do:** Before `const booking = await Booking.findByIdAndUpdate(...)`, add:

  ```js
  if (!payment.bookingId) {
    // No associated booking — skip notification, still mark payment paid
    await payment.populate({ path: 'bookingId', select: 'bookingReference serviceNameSnapshot startAt customerId', populate: { path: 'customerId', select: 'name email phone' } });
    return res.json({ success: true, data: payment });
  }
  ```

  This returns early but still sends back the updated payment, so the admin UI is not broken.

  **Files:** `server/src/controllers/adminController.js`

  **Verify:** `node --check server/src/controllers/adminController.js` passes.

---

## SECTION B — Enhanced Backend Analytics (getAdminReports)

- [ ] 5. **Rewrite `getAdminReports` in adminController.js to return the full analytics shape**

  The current implementation returns `bookingsByStatus` as a flat object and lacks `bookingsByVehicleType`, `bookingsByService`, `monthlyRevenue`, and separate status-count fields. The mobile screen reads `todayAppointments` but the current controller returns the same field under that name — preserve it. Add the missing aggregations.

  **What to do:** Replace the entire `getAdminReports` function body with the expanded version below. Keep `export const getReports = getAdminReports;` alias unchanged at the bottom.

  ```js
  export const getAdminReports = async (req, res, next) => {
    try {
      const now = new Date();

      // Today IST boundaries
      const istTodayString = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
      const [ty, tm, td] = istTodayString.split('-').map(Number);
      const todayStartUTC = new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0) - IST_OFFSET_MS);
      const todayEndUTC   = new Date(Date.UTC(ty, tm - 1, td + 1, 0, 0, 0) - IST_OFFSET_MS);

      // This month IST boundaries
      const monthStartUTC = new Date(Date.UTC(ty, tm - 1, 1, 0, 0, 0) - IST_OFFSET_MS);
      const monthEndUTC   = new Date(Date.UTC(ty, tm, 1, 0, 0, 0) - IST_OFFSET_MS);

      // Last-6-months boundary
      const sixMonthsAgo = new Date(Date.UTC(ty, tm - 7, 1, 0, 0, 0) - IST_OFFSET_MS);

      const [
        totalCustomers,
        totalBookings,
        revenueResult,
        statusCounts,
        todayAppointments,
        monthRevenueResult,
        recentBookings,
        vehicleTypeCounts,
        serviceBookings,
        monthlyRevenueRaw,
      ] = await Promise.all([
        // 1
        User.countDocuments({ role: 'customer', isActive: true }),
        // 2
        Booking.countDocuments(),
        // 3 total revenue from completed bookings
        Booking.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$priceAtBooking' } } },
        ]),
        // 4 status breakdown
        Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        // 5 today appointments
        Booking.countDocuments({ startAt: { $gte: todayStartUTC, $lt: todayEndUTC } }),
        // 6 this month revenue
        Booking.aggregate([
          { $match: { status: 'completed', startAt: { $gte: monthStartUTC, $lt: monthEndUTC } } },
          { $group: { _id: null, total: { $sum: '$priceAtBooking' } } },
        ]),
        // 7 recent bookings
        Booking.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('customerId', 'name email')
          .populate('serviceId', 'name')
          .populate('vehicleId', 'make model type licensePlate'),
        // 8 bookings by vehicle type (via Vehicle lookup)
        Booking.aggregate([
          {
            $lookup: {
              from: 'vehicles',
              localField: 'vehicleId',
              foreignField: '_id',
              as: 'vehicle',
            },
          },
          { $unwind: { path: '$vehicle', preserveNullAndEmpty: false } },
          { $group: { _id: '$vehicle.type', count: { $sum: 1 } } },
        ]),
        // 9 bookings by service (with name + revenue)
        Booking.aggregate([
          {
            $lookup: {
              from: 'services',
              localField: 'serviceId',
              foreignField: '_id',
              as: 'service',
            },
          },
          { $unwind: { path: '$service', preserveNullAndEmpty: false } },
          {
            $group: {
              _id: '$serviceId',
              serviceName: { $first: '$service.name' },
              count: { $sum: 1 },
              revenue: { $sum: '$priceAtBooking' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        // 10 monthly revenue (last 6 months, completed bookings)
        Booking.aggregate([
          {
            $match: {
              status: 'completed',
              startAt: { $gte: sixMonthsAgo },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: { date: '$startAt', timezone: '+05:30' } },
                month: { $month: { date: '$startAt', timezone: '+05:30' } },
              },
              revenue: { $sum: '$priceAtBooking' },
              bookings: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
      ]);

      const totalRevenue     = revenueResult[0]?.total || 0;
      const thisMonthRevenue = monthRevenueResult[0]?.total || 0;

      // Build flat status counts
      const statusMap = {};
      statusCounts.forEach(({ _id, count }) => { statusMap[_id] = count; });

      // Build vehicle type map { Car: N, Bike: N, Scooty: N }
      const bookingsByVehicleType = { Car: 0, Bike: 0, Scooty: 0 };
      vehicleTypeCounts.forEach(({ _id, count }) => {
        if (_id && bookingsByVehicleType.hasOwnProperty(_id)) {
          bookingsByVehicleType[_id] = count;
        }
      });

      // Build service list
      const bookingsByService = serviceBookings.map(({ serviceName, count, revenue }) => ({
        serviceName,
        count,
        revenue,
      }));

      // Format monthly revenue as YYYY-MM strings
      const monthlyRevenue = monthlyRevenueRaw.map(({ _id, revenue, bookings }) => {
        const m = String(_id.month).padStart(2, '0');
        return { month: `${_id.year}-${m}`, revenue, bookings };
      });

      res.json({
        success: true,
        data: {
          totalCustomers,
          totalBookings,
          totalRevenue,
          thisMonthRevenue,
          completedBookings:  statusMap.completed  || 0,
          cancelledBookings:  statusMap.cancelled  || 0,
          pendingBookings:    statusMap.pending     || 0,
          confirmedBookings:  statusMap.confirmed   || 0,
          inProgressBookings: statusMap.in_progress || 0,
          todayAppointments,
          bookingsByStatus:    statusMap,  // kept for backward compat
          bookingsByVehicleType,
          bookingsByService,
          recentBookings,
          monthlyRevenue,
        },
      });
    } catch (err) {
      next(err);
    }
  };
  ```

  **Files:** `server/src/controllers/adminController.js`

  **Verify:** `node --check server/src/controllers/adminController.js` passes. After server boot, `GET /api/admin/reports` with admin JWT returns a JSON body containing all expected keys: `monthlyRevenue`, `bookingsByVehicleType`, `bookingsByService`, `completedBookings`, etc.

---

## SECTION C — Enhanced Mobile Reports Screen

- [ ] 6. **Enhance AdminReportsScreen.js with Monthly Revenue, Vehicle Type cards, and Top Services sections**

  The current screen shows status bar chart + stat cards + recent bookings. Add three new sections below the existing status chart and above the recent bookings list. Also fix the field name mismatch: the screen reads `reports?.todayBookings` but the backend returns `todayAppointments` — update to `reports?.todayAppointments`.

  **What to do:**

  1. Fix the field name: change `const todayBookings = reports?.todayBookings ?? 0;` to `const todayAppointments = reports?.todayAppointments ?? 0;` and update the `StatCard` that uses it (`value={todayBookings}` → `value={todayAppointments}`).

  2. Read the three new data fields from `reports` with safe defaults:
     ```js
     const monthlyRevenue      = reports?.monthlyRevenue || [];
     const bookingsByVehicleType = reports?.bookingsByVehicleType || { Car: 0, Bike: 0, Scooty: 0 };
     const bookingsByService   = reports?.bookingsByService || [];
     ```

  3. **Monthly Revenue section** — add a new `<View style={styles.chartCard}>` block after the status chart. Compute `maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1)`. Render one row per month: label on the left (the 7-char YYYY-MM string), a proportional filled `View` whose `flex` is `revenue / maxRevenue` plus an empty `View` for the remainder, and the formatted rupee amount on the right. Use `colors.ocean` for fill color.

  4. **Vehicle Type cards section** — add a `<View style={styles.chartCard}>` with title "Bookings by Vehicle Type". Render three cards side-by-side (flexDirection: 'row', gap) for Car, Bike, Scooty: each shows the Ionicons icon (`car-outline`, `bicycle-outline`, `speedometer-outline`), the vehicle type name, and the count.

  5. **Top Services section** — add a `<View style={styles.chartCard}>` with title "Top Services". Render each item in `bookingsByService` as a row: service name on the left, booking count on the right. Cap display to 5 items.

  6. All three new sections are placed between the existing status chart block and the existing recent bookings block — do not remove or reorder existing sections.

  7. Add the three new layout styles to `StyleSheet.create`: `vehicleRow`, `vehicleChip`, `serviceRow` — follow the existing `barRow` pattern for sizing.

  **Files:** `mobile/src/screens/admin/AdminReportsScreen.js`

  **Verify:** `npx expo export --platform android` exits 0 with ≥ 1167 modules bundled. Visually, the Reports screen shows four chart/data sections when there is data.

---

## SECTION D — Dev Seed Endpoint

- [ ] 7. **Extract seedServices logic into an exported function in seedServices.js**

  The current `seedServices.js` runs as a standalone script with a `seed()` function that calls `process.exit`. Export the data-seeding logic as a named `seedServicesData()` so it can be called programmatically from the API route without exiting the process.

  **What to do:**

  1. Export `defaultServices` and extract a new async function `seedServicesData()`:
     ```js
     export async function seedServicesData() {
       // Seed Schedule
       const existingSchedule = await Schedule.findOne({ isActive: true });
       if (!existingSchedule) {
         await new Schedule({ isActive: true }).save();
       }
       // Seed Services
       const count = await Service.countDocuments();
       if (count > 0) {
         return { skipped: true, existing: count };
       }
       await Service.insertMany(defaultServices);
       return { seeded: true, count: defaultServices.length };
     }
     ```
  2. Keep the existing `const seed = async () => { ... }` standalone runner at the bottom. Update it to call `seedServicesData()` and then `process.exit(0)`. Remove `process.exit` calls from inside `seedServicesData`.

  **Files:** `server/scripts/seedServices.js`

  **Verify:** `node --check server/scripts/seedServices.js` passes.

---

- [ ] 8. **Add seed/services route to adminRoutes.js and seed:services script to package.json**

  **What to do in adminRoutes.js:**

  After the closing of all existing route registrations (before `export default router`), add a development-only block:

  ```js
  if (process.env.NODE_ENV === 'development') {
    const { seedServicesData } = await import('../../scripts/seedServices.js');
    router.post('/seed/services', protect, requireAdmin, async (req, res, next) => {
      try {
        const result = await seedServicesData();
        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    });
  }
  ```

  Because `adminRoutes.js` uses ES modules (`import`/`export`) and route files are loaded at server startup, use a top-level `if` block with a dynamic `import()` inside it. Since the route file itself is ESM, this is valid. Place the entire block inside an immediately-invoked async IIFE to allow top-level await in the module scope, or restructure: move the `import()` call to inside the route handler itself (lazy import on first request — simpler and avoids top-level await):

  ```js
  if (process.env.NODE_ENV === 'development') {
    router.post('/seed/services', protect, requireAdmin, async (req, res, next) => {
      try {
        const { seedServicesData } = await import('../../scripts/seedServices.js');
        const result = await seedServicesData();
        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    });
  }
  ```

  **What to do in package.json:** Add `"seed:services": "node scripts/seedServices.js"` to the `scripts` block.

  **Files:** `server/src/routes/adminRoutes.js`, `server/package.json`

  **Verify:** `node --check server/src/routes/adminRoutes.js` passes. `npm run seed:services` (from `server/`) runs without error when MongoDB is available.

---

## SECTION E — Complete README.md

- [ ] 9. **Rewrite README.md as a comprehensive project guide**

  The existing README covers prerequisites and basic setup but is missing: full environment variable list, Razorpay config, Android build instructions, full API reference, testing guide, payment config, security notes, and troubleshooting.

  **What to do:** Overwrite `README.md` with a document covering every topic listed. Use the structure below — do not leave any section empty:

  ```
  # PROWASH — Premium Vehicle Cleaning & Care
  ## Architecture
  ## Prerequisites
  ## Quick Start
    ### Backend
    ### Mobile
    ### Pointing the app at the server (API URL config)
  ## Environment Variables
    ### Server (server/.env)  — list ALL variables
    ### Mobile (mobile/.env)
  ## Default Admin Account
  ## Building for Android
  ## Project Structure (3 levels)
  ## API Documentation
    ### Auth
    ### Vehicles
    ### Services
    ### Availability
    ### Bookings
    ### Payments
    ### Notifications
    ### Admin
  ## Testing Guide
  ## Payment Configuration
    ### COD (Cash on Delivery)
    ### Razorpay (Online)
  ## Security Notes
  ## Troubleshooting
  ```

  **Environment variables to document (server):**
  `PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRE`, `NODE_ENV`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

  **Environment variables to document (mobile):**
  `API_BASE_URL` (the only required variable; set to `http://<your-server-ip>:5000`)

  **Default admin:** email `admin@prowash.com` (or whatever `ADMIN_EMAIL` is set to), password `Admin@1234` (or `ADMIN_PASSWORD`), role `admin`.

  **API endpoints to document** (grouped, with method, path, auth, description):
  - Auth: register, login, getMe, forgotPassword, resetPassword, changePassword, logout
  - Vehicles: getMyVehicles, addVehicle, updateVehicle, deleteVehicle
  - Services: getServices, getServiceById
  - Availability: getAvailableSlots
  - Bookings: createBooking, getMyBookings, getBookingById, cancelBooking
  - Payments: createRazorpayOrder, verifyPayment, handleWebhook (no auth), getMyPayments, getPayment
  - Notifications: getNotifications, markRead, markAllRead
  - Admin: dashboard, reports, bookings (list/detail/status), schedule (CRUD + block + holiday), customers (list/detail), vehicles, services (create/update/delete), payments (list/collect-COD), seed/services (dev only)

  **Files:** `README.md` (workspace root: `c:\Users\Dell\Desktop\PROWASH\README.md`)

  **Verify:** File is non-empty and contains all section headings listed above. No automated build step needed.

---

## SECTION F — Final Polish (No Changes Needed for Most Items)

- [ ] 10. **Confirm no-op items and document findings**

  After reading all relevant files, the following items require **no code changes** — they are already correctly implemented:

  | Item | Finding |
  |---|---|
  | BUG 1 — BookingSuccessScreen countdown | `useEffect` cleanup already returns `clearInterval(interval)` on line 63 |
  | BUG 4 — `confirmed → rescheduled` transition | `ALLOWED_TRANSITIONS.confirmed` already includes `'rescheduled'` |
  | colors.black / colors.white | Both `'#000000'` and `'#FFFFFF'` already present in colors.js |
  | SplashScreen nav names | `navigation.replace('AdminHome')` and `navigation.replace('CustomerHome')` match `RootNavigator.js` registered names exactly |
  | AppInput password toggle | `setSecure((s) => !s)` toggle is correctly implemented |
  | ConfirmDialog backdrop | `rgba(0,0,0,0.55)` overlay with nested `Pressable` stops touch propagation correctly |

  No file changes. This item is documentation only — the coder can skip it.

  **Files:** None.

  **Verify:** N/A — captured as findings above.

---

## SECTION G — Server Health Check

- [ ] 11. **Verify app.js route mounts and health endpoint**

  After reading `app.js`, all 8 route groups are already mounted without duplicates:
  1. `/api/auth`
  2. `/api/vehicles`
  3. `/api/services`
  4. `/api/availability`
  5. `/api/bookings`
  6. `/api/payments`
  7. `/api/notifications`
  8. `/api/admin`

  `GET /api/health` is present and returns `{ status: 'ok', timestamp: ... }`.

  **No code changes required.** This item is a verification gate only.

  **Files:** None.

  **Verify (coder must run):**
  ```bash
  node --check server/src/app.js
  ```
  Expected: no output (clean parse).

---

## SECTION H — Verification

- [ ] 12. **Run `node --check` on all modified server files**

  Run the following commands from the workspace root. Each must exit with code 0 and no output:

  ```bash
  node --check server/src/services/availabilityService.js
  node --check server/src/controllers/paymentController.js
  node --check server/src/controllers/adminController.js
  node --check server/src/routes/adminRoutes.js
  node --check server/scripts/seedServices.js
  node --check server/src/app.js
  ```

  **Files:** No changes — verification only.

  **Verify:** All 6 commands exit 0 with no output.

---

- [ ] 13. **Server smoke test — start, verify boot, stop**

  From `server/`, ensure a `.env` with `MONGO_URI` and `JWT_SECRET` is present, then:

  ```bash
  # Start server in background
  node src/server.js &
  SERVER_PID=$!
  sleep 3

  # Health check
  curl -s http://localhost:5000/api/health

  # Stop server
  kill $SERVER_PID
  ```

  Expected output from curl: `{"status":"ok","timestamp":"..."}` (status 200).

  **Files:** None.

  **Verify:** Server boots without `Error:` lines in stderr, health check returns 200.

---

- [ ] 14. **Seed scripts — seedAdmin and seedServices**

  ```bash
  cd server
  node scripts/seedAdmin.js
  node scripts/seedServices.js
  ```

  Expected output:
  - `Admin seeded successfully: admin@prowash.com` (or "already exists")
  - `Services seeded: 6 services created.` (or "already exist")

  **Files:** None.

  **Verify:** Both scripts exit with code 0.

---

- [ ] 15. **API smoke tests — 5 endpoints**

  Requires server running and admin seeded. Replace `TOKEN` with the JWT from login response.

  ```bash
  # 1. Health
  curl -s http://localhost:5000/api/health
  # Expected: {"status":"ok",...}

  # 2. Login
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@prowash.com","password":"Admin@1234"}'
  # Expected: {"success":true,"data":{"token":"...",...}}

  # 3. Services list (public)
  curl -s http://localhost:5000/api/services
  # Expected: {"success":true,"data":{"services":[...],...}} with ≥1 service

  # 4. Admin reports (requires token)
  curl -s http://localhost:5000/api/admin/reports \
    -H "Authorization: Bearer $TOKEN"
  # Expected: {"success":true,"data":{"totalCustomers":...,"monthlyRevenue":[...],...}}
  # Confirm "monthlyRevenue", "bookingsByVehicleType", "bookingsByService" keys are present

  # 5. Availability
  curl -s "http://localhost:5000/api/availability?serviceId=<id>&date=$(date +%Y-%m-%d -d 'tomorrow')"
  # Expected: {"success":true,"data":[...]} — may be empty array if no slots, but must not 500
  ```

  **Files:** None.

  **Verify:** All 5 curl commands return HTTP 200 with `"success":true`.

---

- [ ] 16. **Expo Android export — must exit 0 with ≥ 1167 modules**

  ```bash
  cd mobile
  npx expo export --platform android 2>&1 | tail -20
  ```

  Expected: process exits 0, output contains `Bundling complete` or `Exported` message, and the module count in the bundle log is ≥ 1167.

  **Files:** None.

  **Verify:** Exit code 0. No `Error:` or `ENOENT` lines that halt the bundle.

---

## Dependency Order Summary

```
Items 2, 3, 4   →  can be done in parallel (independent bug fixes, different files)
Item 5           →  must precede item 6 (backend analytics shape must exist before mobile reads it)
Item 7           →  must precede item 8 (seedServicesData export must exist before route imports it)
Items 9, 10, 11  →  independent of all others
Items 12–16      →  must be last (verification gates; depend on all earlier items being complete)
```
