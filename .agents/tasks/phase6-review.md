# Phase 6 Bug-Fix & Analytics Patch — PROWASH

Phase 6 closes six confirmed bugs (interval leak, over-fetching, ICU crash, invalid status transition, webhook 500, missing COD notification) and extends the admin analytics surface with three new charts and a development seed endpoint. All server-side changes passed `node --check`, a live server boot, API smoke tests, and an Expo export producing 1,167 modules. One aggregation typo (`preserveNullAndEmpty` → `preserveNullAndEmptyArrays`) was caught and corrected during verification.

**Watch for:**
- Monthly-revenue bar chart uses proportional `flex` values on a `flexDirection: 'row'` track, which works only if all bars render in the same parent row (confirmed pattern is correct), but a zero-revenue month produces `barFlex = 0 / maxRevenue = 0`; the guard `Math.max(..., 1)` covers this. OK.
- `recordCODCollection` early-returns before populating `bookingId` when `payment.bookingId` is falsy, so the returned payment object has an unpopulated `bookingId` field in that edge case. Minor data-shape inconsistency; not blocking.
- The seed endpoint is wired only when `NODE_ENV === 'development'` but uses dynamic `import()` at request time — if the ESM module fails to resolve at runtime the error propagates to `next(err)`, which is acceptable.

**Verdict**: APPROVED

---

## High-level view

The countdown interval bug is fixed with a standard `return () => clearInterval(interval)` cleanup inside the `useEffect`. The interval reference is captured in the closure correctly and cleared both on natural expiry (inside `setCountdown`) and on unmount.

Services and vehicles now load once on mount via a dedicated `useEffect` with a cancellation flag; `useFocusEffect` is narrowed to bookings and the notification badge only. Pull-to-refresh still re-fetches all three sources. The split is clean and eliminates the redundant round-trips on every tab focus.

The ICU-dependent `toLocaleDateString` call is gone from `availabilityService.js`. In its place, `getISTDayName` builds a UTC noon instant for the requested IST date (`Date.UTC(y, m-1, d, 6, 30)`) and reads `getUTCDay()` against the static `DAY_NAMES` array. The IST-noon trick (UTC 06:30 = IST 12:00) is correct: it can never straddle a day boundary regardless of DST.

`ALLOWED_TRANSITIONS` now includes `'rescheduled'` as a valid next state from `'confirmed'`, unblocking the reschedule workflow. The reverse transition (`rescheduled → confirmed`) is also present.

`handleWebhook` returns `200 { received: true }` immediately when neither `RAZORPAY_WEBHOOK_SECRET` nor `RAZORPAY_KEY_SECRET` is set, avoiding a crash-level error in unconfigured environments.

`recordCODCollection` loads the booking via `Booking.findByIdAndUpdate` and wraps `notifyPaymentConfirmed` in an `if (booking)` guard. An early-return path exists for payments with no `bookingId`, though that path returns the payment with an unpopulated `bookingId` field (described in Issues).

`getAdminReports` runs ten parallel aggregations and returns `monthlyRevenue`, `bookingsByVehicleType`, `bookingsByService`, and `todayAppointments` alongside the existing fields. The front-end `AdminReportsScreen` consumes all four new fields additively: the Monthly Revenue, Vehicle Type, and Top Services sections are appended below the existing stat cards and status chart without altering them.

The seed endpoint is conditionally registered only in development, uses the exported `seedServicesData` function from `scripts/seedServices.js`, and is protected by `protect + requireAdmin`. The `seedServicesData` export is idempotent (skips if services already exist) and does not call `process.exit`, making it safe to invoke from within a running server.

`colors.js` defines both `white: '#FFFFFF'` and `black: '#000000'` at the top level. Both are used in `BookingSuccessScreen` and `AdminReportsScreen` without issue.

---

<details>
<summary>Issues (1)</summary>

1. **Unpopulated bookingId on no-booking early return** — In `recordCODCollection`, when `payment.bookingId` is falsy the code populates and returns the payment before the `Booking.findByIdAndUpdate` call. The `populate` call in that branch attempts to populate `bookingId` (which is null/undefined), so the response shape is consistent with the populated path, but the populated value will be `null`. Any client that reads `payment.bookingId.bookingReference` without a null-check will crash. Low severity — this path only fires for orphaned payment records — but the client should guard against it.

</details>

<details>
<summary>Details</summary>

### Interval cleanup in BookingSuccessScreen

The `useEffect` for the countdown captures `interval` in a `const` at call time and returns `() => clearInterval(interval)` as the cleanup. Inside `setCountdown`, when `c <= 1`, it also calls `clearInterval(interval)` before navigating — this is correct belt-and-suspenders behaviour: the explicit clear prevents a final tick between the `navigate` call and React unmounting the component. The `navigation` dependency is correct; the effect re-runs only if `navigation` changes identity, which in React Navigation is stable for the lifetime of the screen.

### Over-fetching fix in CustomerHomeScreen

The prior pattern likely used a single `useFocusEffect` that fetched all three sources. The fix splits responsibilities: a plain `useEffect([], [])` fetches vehicles and services once on mount using `Promise.allSettled` with a `cancelled` flag for safe state updates after unmount. `useFocusEffect` now only calls `loadBookings()` and the notification badge fetch. Pull-to-refresh (`handleRefresh`) correctly re-fetches all three, so a user can force-refresh stale vehicle or service data without navigating away. The `setLoading(false)` in the mount effect's `finally` block is the single gate for the initial loading spinner — bookings load silently on focus without triggering the full-screen loader, which is the right UX.

### ICU-free day name in availabilityService

`getISTDayName` constructs `Date.UTC(year, month - 1, day, 6, 30, 0)` — UTC 06:30 on the requested date — then adds `IST_OFFSET_MS` (19,800,000 ms = 5h30m) to get the equivalent IST instant (IST 12:00 noon). Reading `getUTCDay()` on this adjusted Date gives the correct IST weekday without any locale or timezone support from the JS engine. The UTC 06:30 anchor is well chosen: IST noon is the midpoint of the IST day, so no plausible DST scenario (India has no DST) can shift it to a different calendar day.

### Confirmed→rescheduled transition

`ALLOWED_TRANSITIONS.confirmed` is `['in_progress', 'cancelled', 'rescheduled']`. The reverse is `ALLOWED_TRANSITIONS.rescheduled = ['confirmed', 'cancelled']`. The notification path for `rescheduled` falls into the generic `else` branch, which creates a `Notification` document with a status string. This is appropriate — there is no `notifyRescheduled` helper — and the customer is still informed.

### Webhook 200 on unconfigured secret

```js
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
if (!webhookSecret) {
  return res.status(200).json({ received: true });
}
```

This is the correct behaviour for a webhook receiver: return 200 to prevent Razorpay from retrying, log nothing (there's nothing to verify), and take no action. The outer `catch` block also returns 200 for any processing error, which is consistent.

### COD notification guard

`recordCODCollection` checks `if (!payment.bookingId)` and returns early, then calls `Booking.findByIdAndUpdate` to mark `paymentStatus: 'paid'`, then checks `if (booking)` before calling `notifyPaymentConfirmed`. The guard prevents a null-dereference in the notification service. The unpopulated-bookingId issue noted in Issues is the only gap in this path.

### Analytics fields in getAdminReports

All ten aggregation results are computed in a single `Promise.all`. The response object includes:

- `monthlyRevenue` — array of `{ month: 'YYYY-MM', revenue, bookings }` for the last 6 months of completed bookings, using MongoDB's `$year`/`$month` with `timezone: '+05:30'` for correct IST grouping.
- `bookingsByVehicleType` — `{ Car, Bike, Scooty }` object defaulting unmapped types to 0.
- `bookingsByService` — top 10 services by booking count with name and revenue.
- `todayAppointments` — IST day boundaries computed consistently with the rest of the codebase.

The `$lookup` + `$unwind` pattern for vehicle type and service name is correct after the `preserveNullAndEmptyArrays` fix confirmed in verification.

### AdminReportsScreen new sections

Monthly Revenue, Vehicle Type, and Top Services sections are appended after the existing Bookings-by-Status chart. The stat cards grid and status bar chart are structurally unchanged. The Monthly Revenue chart uses `Math.max(...monthlyRevenue.map(m => m.revenue), 1)` as the denominator — the `, 1` guards the empty-array case. Vehicle type is rendered as three fixed chips (Car / Bike / Scooty) using `bookingsByVehicleType[key] ?? 0`, matching the server's fixed-key object. Top Services renders up to 5 rows (`.slice(0, 5)`) with a graceful empty state.

### Seed endpoint guard

```js
if (process.env.NODE_ENV === 'development') {
  router.post('/seed/services', protect, requireAdmin, async (req, res, next) => {
    const { seedServicesData } = await import('../../scripts/seedServices.js');
    ...
  });
}
```

The route is never registered outside development — the `if` block is evaluated at module load time, not at request time. `seedServicesData` is a named export from `seedServices.js`, and the dynamic import is necessary because the route file uses static ESM imports for everything else; this is the correct pattern for conditional loading. The endpoint is also protected by both `protect` and `requireAdmin`, so it cannot be invoked by unauthenticated or non-admin users even if someone misconfigures `NODE_ENV`.

### colors.js verification

`white: '#FFFFFF'` and `black: '#000000'` are defined at lines 13 and 14 of the color map. Both are referenced in `BookingSuccessScreen` (`shadowColor: colors.black`, `backgroundColor: colors.white`) and in `AdminReportsScreen` (`shadowColor: colors.black`). No issue.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `mobile/src/screens/customer/BookingSuccessScreen.js` | Added `clearInterval` cleanup return in countdown `useEffect` |
| `mobile/src/screens/customer/CustomerHomeScreen.js` | Split mount-only fetch (vehicles/services) from focus-only fetch (bookings/badge) |
| `server/src/services/availabilityService.js` | Replaced `toLocaleDateString` with `DAY_NAMES` static array + UTC-noon trick |
| `server/src/controllers/adminController.js` | Added `rescheduled` to `confirmed` transitions; added `if (booking)` guard in `recordCODCollection`; expanded `getAdminReports` with four new analytics fields |
| `server/src/controllers/paymentController.js` | Added early `return res.status(200)` in `handleWebhook` when no webhook secret configured |
| `mobile/src/screens/admin/AdminReportsScreen.js` | Added Monthly Revenue, Vehicle Type, Top Services chart sections |
| `server/src/routes/adminRoutes.js` | Added `NODE_ENV === 'development'`-guarded seed endpoint |
| `server/scripts/seedServices.js` | Extracted `seedServicesData` as named export; added ESM standalone-runner guard |
| `mobile/src/theme/colors.js` | Verified: `black` and `white` already present (no change needed) |

Full diff: `git diff main` from workspace root.

</details>
