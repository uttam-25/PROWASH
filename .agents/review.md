# Slot capacity fix, geo partner assignment, and address collection

Five files changed to resolve a "booking already exists" false-positive, wire customer addresses into the booking flow, and add automatic nearest-partner assignment after booking creation.

The root cause of the false-positive was a strict ISO string equality check (`s.startAt === startAt.toISOString()`) that failed whenever the client-submitted timestamp differed by even one millisecond from the server-generated slot boundary. A 60-second absolute tolerance window replaces it. Simultaneously, `rescheduled` bookings were counting against slot capacity, which caused previously-rescheduled slots to appear full even though the original booking vacated the slot. The geo-assignment path is entirely fire-and-forget and does not delay the HTTP response.

Watch for: (**confirmed**) lat/lng coordinates are manual text inputs with no geocoding — the assignment silently skips if the customer leaves them blank, producing a booking with no partner and no user-visible warning. (**confirmed**) The address validation fires as an early return inside `handleConfirm`, not as a disabled button state, so a user who skips the address field and hits Confirm sees an inline error but the Confirm button remains clickable. (**confirmed**) The slot tolerance window admits any timestamp within ±60 seconds of a boundary; a client could submit a timestamp 59 seconds late and be accepted for a slot that differs from what was displayed.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The availability fix is a one-line `$nin` extension. The diff clearly shows `rescheduled` added alongside the existing `cancelled` and `rejected` entries — no previously excluded status was removed. The 1-hour same-day booking cutoff (down from 2 hours) is a separate change in the same file.

The slot tolerance replaces an exact ISO string comparison with a 60-second window. Slots are generated at 30-minute intervals (1 800 000 ms apart), so a 60-second (60 000 ms) window cannot reach the adjacent slot — the math holds. The same fix is applied consistently to both `createBooking` and `rescheduleBooking`.

The fire-and-forget chain has no `await` and a `.catch`, so the HTTP response goes out before assignment starts. The `findOneAndUpdate` atomic filter (`partnerId: null`, status in `['pending','searching_partner']`) prevents double-assignment to the same booking from concurrent calls.

The address block validates the text field but makes lat/lng optional. This contract is invisible to the user — there is no tooltip or UI indication that leaving coordinates blank means "no auto-assignment", which produces the silent fallback described in the Issues section.

---

<details>
<summary>Issues (4)</summary>

1. **Silent no-partner fallback** — When `lat`/`lng` are blank, `tryAssignPartner` returns `null` silently. The booking is created with `status: 'pending'` and no partner, but the customer's success screen says "Searching for a Cleaning Partner…" indefinitely. Either surface a message ("Coordinates not provided — your booking will be assigned manually") or make lat/lng required. (**confirmed**)

2. **Confirm button not disabled on missing address** — `handleConfirm` guards with an early return and shows `addressError`, but the button itself is only disabled when `!paymentMethod || submitting`. A user who ignores the inline error and clicks Confirm again will hit the guard again, but there is no obvious disabled state signaling to them that the address is blocking submission. Consider adding `!serviceAddress.trim()` to the `disabled` condition. (**confirmed**)

3. **Late-timestamp slot injection** — The 60-second tolerance means a client could POST a `startAt` that is 59 seconds after a slot boundary. The slot match will succeed, but the stored `booking.startAt` will not align with the displayed slot time. If any downstream code (partner ETAs, schedule conflict checks) relies on `startAt` being exactly on a slot boundary, this will drift. Fix: snap `startAt` to the matched slot's `startAt` before writing to the database. (**confirmed**)

4. **No service-level capacity guard in `partnerAssignmentService`** — The conflict check in `tryAssignPartner` filters by `partnerId` and time overlap, but does not filter by `serviceId`. A partner assigned to a "Bike Basic Wash" at 10:00 will be skipped correctly for a new booking at 10:00. However, the per-service slot capacity enforced in `availabilityService` (step 12, `maxConcurrentBookings`) is not re-checked during partner assignment. If the assignment loop runs concurrently for two bookings at the same slot, both could pass the conflict check before either write completes. The `findOneAndUpdate` atomic check prevents double-assignment to the same booking, but does not prevent assigning two different bookings to the same partner at the same time if both conflict checks run before either assignment commits. This is a TOCTOU window. (**likely**)

</details>

---

<details>
<summary>Details</summary>

### Slot tolerance and `startAt` snapping

The 60-second absolute tolerance (`Math.abs(...) < 60000`) is safe against adjacent-slot confusion — the nearest adjacent boundary is 1 800 000 ms away. However, when the match succeeds on a timestamp that is not exactly on the boundary, the `booking.startAt` written to MongoDB is the client-supplied value, not the canonical slot boundary. The diff shows:

```js
// Before
const slotMatch = slots.find((s) => s.startAt === startAt.toISOString());

// After
const startAtMs = startAt.getTime();
const slotMatch = slots.find((s) => Math.abs(new Date(s.startAt).getTime() - startAtMs) < 60000);
```

`slotMatch` is used only to confirm availability; `startAt` (the client value) is stored in the booking. Snapping would be:

```js
if (slotMatch) {
  startAt = new Date(slotMatch.startAt); // canonical boundary
}
```

### Atomic race condition window

`findOneAndUpdate` with `{ partnerId: null, status: { $in: ['pending', 'searching_partner'] } }` is a correct atomic write for single-booking exclusivity. Two concurrent calls for the same `booking._id` cannot both succeed because the second will see `partnerId` already set.

The gap is between two *different* bookings at the same time slot competing for the same partner. Both calls read the partner's conflict count before either writes its assignment. Both see `conflict = 0`, both proceed to `findOneAndUpdate`, and both succeed (for their respective bookings). The partner is now double-booked. This window exists because the per-partner conflict check is not inside a transaction. Under low concurrency (typical for a small wash service), this is unlikely to manifest. At higher throughput it becomes a real risk.

### Address UX and silent fallback

The address section is conditionally rendered in Step 5. The text field is required and its validation fires immediately on submit. The lat/lng inputs are optional and have no validation. If a customer enters only the address text (no coordinates), `tryAssignPartner` is skipped because `booking.customerLocation?.lat` is falsy. The booking enters `pending` state.

The success screen's status label for `pending` is `'⏳ Booking Pending'` — the copy does not explain that the pending state is due to missing coordinates. `'searching_partner'` status shows `'🔍 Searching for a Cleaning Partner...'` with an animated ping dot, which would also mislead — but that status is only set when `req.body.isImmediate === true`, which is not sent by the wizard. So the displayed status will be `pending`, not `searching_partner`. Still, the customer has no indication that manual coordinates are needed for auto-assignment.



</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `server/src/services/availabilityService.js` | Added `rescheduled` to capacity-count exclusion list; reduced same-day cutoff from 2h to 1h |
| `server/src/controllers/bookingController.js` | Added `customerLocation` to body destructuring and booking creation; replaced exact ISO slot match with 60-second tolerance; added fire-and-forget `tryAssignPartner` block; same tolerance fix applied to `rescheduleBooking` |
| `server/src/services/partnerAssignmentService.js` | New file — Haversine geo filtering, per-partner conflict check, atomic `findOneAndUpdate` assignment |
| `web/src/pages/customer/BookingWizard.jsx` | Added `serviceAddress`, `serviceLat`, `serviceLng`, `addressError` state; address block in Step 5; early-return address validation in `handleConfirm`; `customerLocation` object passed in API call |
| `web/src/pages/partner/PartnerDashboardPage.jsx` | Replaced toggle-icon button with prominent GO ONLINE / GO OFFLINE button; added verification pending banner; added 30-second auto-refresh interval with cleanup; enhanced request cards with vehicle type, license plate, customer name, booking time, and price inline |

Full diff: `git diff HEAD~1` against commit `80fc050`

</details>
