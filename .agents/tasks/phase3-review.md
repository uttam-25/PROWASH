# Phase 3: Booking & Availability Implementation

Phase 3 adds the complete booking flow to PROWASH: an availability engine on the server, full booking CRUD with status lifecycle, and five matching mobile screens (BookWashScreen through BookingDetailsScreen) plus admin surfaces for managing bookings. The core design is a server-authoritative slot model — slots are generated from a Schedule document, filtered for breaks/holidays/concurrent capacity, and re-validated at create time so the client can never race-book a taken slot. The price comes exclusively from the service record in the database; it cannot be injected by the client.

**Watch for:** (confirmed) `BookingSuccessScreen` auto-redirects to `HomeTab` after 10 seconds but the timer is never cleared if the user manually navigates away first — a stale `navigation.navigate` fires into potentially detached state. (confirmed) `AdminBookingDetailsScreen.VALID_TRANSITIONS.confirmed` is `['in_progress', 'cancelled']` while the server's `ALLOWED_TRANSITIONS.confirmed` is `['in_progress', 'cancelled', 'rescheduled']` — the admin client cannot mark a confirmed booking as rescheduled even though the server supports it. (confirmed) `CustomerHomeScreen` calls `bookingService.getMyBookings()` with no arguments, pulling the default 20 bookings on every home screen focus just to display 3 — needlessly expensive as the booking list grows.

**Verdict**: APPROVED

---

## High-level view

The availability algorithm in `availabilityService.js` converts IST times to UTC correctly throughout: `istHHMMtoUTC` subtracts `IST_OFFSET_MS` from a `Date.UTC` value rather than relying on the local timezone of the server process, so it is portable. The 2-hour lead-time cutoff, working-day check, holiday exclusion, break overlap filter, blocked-period filter, and concurrent-booking count are all present and applied in the right order.

Security around booking creation is sound. `createBooking` reads `service.price` from the database and stores it as `priceAtBooking`; there is no path from `req.body` to the stored price. Vehicle ownership is verified before any booking object is created. Availability is re-checked server-side on every create and reschedule call, and a 409 with alternatives is returned if the slot was taken between the client's availability fetch and the create call.

`BookWashScreen` implements all five steps and correctly gates the Continue button per step. The 409 conflict path sends the user back to step 3 with a clear error message, and `isSubmitting` blocks double-taps during the async create call. `BookingSuccessScreen` includes the animated checkmark, booking reference copy, detail card, auto-redirect countdown, and both navigation actions. `MyBookingsScreen` exposes all required filter tabs including an "Upcoming" pseudo-filter implemented client-side.

The navigator registers every screen needed by the flow. `CustomerHomeScreen`'s "Book a Wash" hero card navigates to `ServicesTab → BookWash`. `BookingSuccessScreen` navigates to `BookingsTab → BookingDetails` and to `HomeTab`. `AdminBookingsScreen` fetches from `/api/admin/bookings` with server-side status filtering. The status transition buttons in `AdminBookingDetailsScreen` are dynamically derived from a local `VALID_TRANSITIONS` map that is one transition short of the server: `confirmed → rescheduled` is permitted server-side but absent from the client map.

Data integrity holds: `statusHistory` is always appended via `.push()` and never replaced, `bookingReference` is generated in a `pre('save')` hook using a collision-resistant `Date.now().toString(36) + randomBytes(3)` scheme, and both `cancelledAt`/`cancelledBy` are set on customer and admin cancellation paths.

---

<details>
<summary>Issues (3)</summary>

1. **Stale countdown navigation** — `BookingSuccessScreen`'s 10-second `setInterval` calls `navigation.navigate('HomeTab')` on expiry. If the user presses "View Booking Details" first, React Navigation navigates away. Whether the interval fires into detached state depends on whether the screen is unmounted (cleanup runs) or merely hidden. The `gestureEnabled: false` setting prevents back-swipe but not forward navigation, so the screen may stay mounted in the stack below `BookingDetails`. **Action**: add a `navigation.isFocused()` guard inside the interval callback before calling `navigate`.

2. **Admin client missing confirmed → rescheduled transition** — `AdminBookingDetailsScreen.VALID_TRANSITIONS.confirmed` is `['in_progress', 'cancelled']` but the server's `ALLOWED_TRANSITIONS.confirmed` includes `'rescheduled'` as a valid target. An admin cannot trigger this transition from the app even though the API accepts it. **Action**: add `'rescheduled'` to `VALID_TRANSITIONS.confirmed` in `AdminBookingDetailsScreen`.

3. **Home screen over-fetches bookings** — `CustomerHomeScreen` calls `bookingService.getMyBookings()` with no params, fetching up to 20 bookings on every focus event to display 3. **Action**: pass `{ limit: 5 }` or a server-side `status` filter to scope the request.

</details>

---

<details>
<summary>Details</summary>

### Availability algorithm and ICU dependency

The IST-to-UTC conversion uses arithmetic (`Date.UTC(...) - IST_OFFSET_MS`) rather than the server's local timezone, making it portable across deployment environments. The day-of-week lookup is the one exception: `getISTDayName` uses `toLocaleString({ timeZone: 'Asia/Kolkata' })`, which requires the Node.js runtime to include full ICU data. The default Node.js binary ships with `small-icu`; if the server is deployed on a minimal image without full ICU, day-of-week resolution silently falls back to the system locale and `workingDays` filtering breaks. This should be verified in the deployment environment or replaced with arithmetic.

The concurrent booking query excludes `cancelled` and `rejected` but counts `rescheduled` as occupying capacity, which is correct — a rescheduled booking still holds the new time slot until it transitions to `confirmed` or `cancelled`.

### Price integrity and ownership check

`createBooking` reads price from `service.price` in the database and stores it as `priceAtBooking`; no price field is destructured from `req.body`. Vehicle ownership uses `vehicle.owner.toString() !== req.user._id.toString()` — both sides stringified before comparison to avoid ObjectId reference equality issues.

### 409 race condition handling

The server-side re-validation matches the requested `startAt` against generated slots via strict ISO string equality. The 409 response includes up to 3 alternative slots. `BookWashScreen` renders a red error box with a "Pick Another Time" button that clears `selectedSlot` and returns to step 3. `isSubmitting` is set before the async call and cleared in `finally`, blocking double-taps.

### Stale countdown timer in BookingSuccessScreen

The countdown `setInterval` calls `navigation.navigate('HomeTab')` when the counter reaches zero. The cleanup function removes the interval on unmount. If the user presses "View Booking Details" before the timer fires, `navigation.navigate` is called, which unmounts the screen, which clears the interval — so in the normal flow this is safe. The residual risk is if React Navigation keeps the screen mounted in a stack (e.g., the screen is pushed below another screen rather than replaced). In that configuration the interval would continue ticking and fire a second navigate when it expires. The `options={{ gestureEnabled: false, headerBackVisible: false }}` on the `BookingSuccess` route prevents back-navigation but not forward navigation via the buttons. Adding a `navigation.isFocused()` guard to the interval callback would eliminate the risk entirely.

### Admin transition map gap

`AdminBookingDetailsScreen.VALID_TRANSITIONS` matches the server for most statuses, but `confirmed` is `['in_progress', 'cancelled']` while the server's `ALLOWED_TRANSITIONS.confirmed` is `['in_progress', 'cancelled', 'rescheduled']`. An admin cannot move a confirmed booking to `rescheduled` from the mobile app, even though the API accepts it. This is a client-side omission, not a server bug. The `rescheduled: ['confirmed', 'cancelled']` client entry does correctly match the server.

`AdminBookingDetailsScreen` also fetches booking details directly via `api.get('/admin/bookings/:id')` rather than through a `bookingService` method, bypassing the service layer that the rest of the admin UI uses. Inconsistent but not a bug.

### BookingDetailsScreen reschedule flow

The serviceId resolution chain `booking.serviceId?._id || booking.serviceId || booking.service?._id || booking.service` handles both populated and unpopulated API responses. One edge case: if `serviceId` resolves to a raw ObjectId string (unpopulated), `.toString()` is called — correct. But if the booking was fetched with full population, `booking.serviceId._id` is used — also correct. The reschedule call passes `rescheduleSelectedSlot.startAt` as the ISO string; the server accepts it via `req.body.newStartAt`.

### Test coverage

There are no test files in the diff. The availability algorithm, in particular the concurrent booking count, the break/blocked-period overlap logic, and the IST boundary calculations, have no automated coverage. For a booking system, the slot generation and re-validation paths are high-value targets for unit tests — particularly edge cases around slots that span midnight IST, slots at exactly the 2-hour cutoff, and the `maxConcurrentBookings` boundary.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `server/src/models/Schedule.js` | New model: schedule config with working days, hours, breaks, blocked periods, holidays |
| `server/src/models/Booking.js` | New model: full booking schema with status history, bookingReference pre-save hook |
| `server/src/services/availabilityService.js` | New: IST-aware slot generation with break/holiday/concurrent filters |
| `server/src/controllers/availabilityController.js` | New: GET availability endpoint + admin POST schedule endpoint |
| `server/src/controllers/bookingController.js` | New: createBooking, getMyBookings, getBookingById, cancelBooking, rescheduleBooking |
| `server/src/controllers/adminController.js` | New: getAdminBookings (with date/status/vehicle/search filters), updateBookingStatus with transition guard, dashboard, reports |
| `server/src/routes/bookingRoutes.js` | New: booking routes with protect middleware and validation |
| `server/scripts/seedServices.js` | New: seeds 6 default services and a default Schedule document |
| `mobile/src/services/bookingService.js` | New: all booking API calls, unified bookingService object + named exports |
| `mobile/src/screens/customer/BookWashScreen.js` | New: 5-step booking wizard with vehicle type, vehicle, service, date/time, review/confirm |
| `mobile/src/screens/customer/BookingSuccessScreen.js` | New: post-booking confirmation with animated checkmark, reference copy, auto-redirect |
| `mobile/src/screens/customer/MyBookingsScreen.js` | New: booking list with 7-tab filter bar |
| `mobile/src/screens/customer/BookingDetailsScreen.js` | New: booking detail view with cancel/reschedule actions and status timeline |
| `mobile/src/screens/customer/CustomerHomeScreen.js` | New: home screen with Book Now CTA, recent vehicles/bookings/services sections |
| `mobile/src/navigation/CustomerNavigator.js` | New: tab + stack navigator registering all customer and booking screens |
| `mobile/src/screens/admin/AdminBookingsScreen.js` | New: admin booking list with server-side status filter tabs |
| `mobile/src/screens/admin/AdminBookingDetailsScreen.js` | New: admin booking detail with status transition buttons |

Full diff: `git diff main` from workspace root.

</details>
