# Partner portal, Socket.IO real-time, and PWA scaffolding — re-review pass

This is a second-pass review. The prior review (phase7-review.md v1) raised 9 issues; all 9 are confirmed fixed. Two new issues surface in this pass, both introduced by Phase 7 code: a services API response-shape mismatch that makes the service list empty in `BookingWizard`, and a cancel flow that always returns a 400 because the client never sends the required reason body.

**Watch for:** `BookingWizard` step 3 is broken — `getServices` returns `{ data: [...] }` but the wizard reads `data.services`, so the list is always empty and the user is stuck (confirmed). The cancel-booking API sends no body, so the server's required-reason check always fires (confirmed).

**Verdict**: NEEDS_CHANGES

---

## High-level view

All 9 findings from the prior pass are addressed. The dispatch gap is closed: `getNearbyRequests` now includes `pending` alongside `searching_partner`, so normal bookings are visible to partners. The socket payload field mismatch is corrected; `booking:assigned` reads `data.partnerName` and the polling fallback guards on `typeof === 'object'` before setting partner info. The `partners` room role guard, the `rejectRequest` verification check, the PWA icons, service worker, dev proxy, status history timestamps, and price snapshot display are all confirmed fixed.

Two new correctness defects are in scope. `getServices` has always returned `{ success, data: [...] }` — the array directly under `data` — but `BookingWizard` (introduced in this phase) reads `res.data.data.services`, which is `undefined` on that shape, so the fallback `|| []` fires every time. Step 3 of the wizard always shows "No services available". `ServicesPage` and `DashboardPage` have the same mismatch but were pre-existing and are out of scope.

The cancel booking flow is also broken end-to-end. The `bookingsAPI.cancelBooking` client introduced in Phase 7 makes a PATCH with no request body. The server's `cancelBooking` handler requires a non-empty `reason` field and returns a 400 `AppError` when absent. Both `MyBookingsPage` and `BookingDetailPage` call `cancelBooking(id)` with no second argument, so the "Cancel" button always fails silently (the error is caught and toasted, booking remains active).

---

<details>
<summary>Issues (2)</summary>

1. **Services always empty in BookingWizard** — `getServices` returns `{ data: Array }` but `BookingWizard.fetchServices` reads `res.data.data.services`, which is `undefined`, so the list always falls back to `[]` and step 3 shows "No services available". Fix: change the read to `res.data.data?.services || res.data.data || []` (matching the vehicles pattern already in the wizard), or wrap the server response: `res.json({ success: true, data: { services } })`.

2. **Cancel booking always fails with 400** — `bookingsAPI.cancelBooking(id)` sends no body; `bookingController.cancelBooking` requires a non-empty `reason` and returns `AppError('A cancellation reason is required', 400)`. Both `MyBookingsPage` and `BookingDetailPage` hit this path. Fix: add a `reason` parameter to `bookingsAPI.cancelBooking` and collect it in the `ConfirmDialog`, or make the reason optional on the server for customer-initiated cancels.

</details>

---

<details>
<summary>Details</summary>

### Services always empty in BookingWizard step 3

`serviceController.getServices` calls `res.json({ success: true, data: services })` where `services` is a Mongoose array. So `res.data.data` on the client is the array itself, not an object with a `.services` key. `BookingWizard.fetchServices` reads:

```js
const list = res.data.data.services || []
```

`res.data.data.services` is `undefined` on an array, so `list` is always `[]`. Step 3 renders the `EmptyState` component every time regardless of what the server returns. The URL-param pre-selection of a service (`preselectedServiceId`) is also dead for the same reason — `list` is always empty so `list.find(...)` never matches.

`ServicesPage` and `DashboardPage` have the identical read but were present before Phase 7 and are out of scope here. A server-side shape change to `{ data: { services } }` would fix all callers at once.

### Cancel booking returns 400 for every customer cancel attempt

`bookingController.cancelBooking` (pre-existing, unchanged in Phase 7):

```js
const reason = (req.body.reason || req.body.cancellationReason || '').trim();
if (!reason) {
  return next(new AppError('A cancellation reason is required', 400));
}
```

The Phase 7 `bookings.js` API client:

```js
cancelBooking: (id) => api.patch(`/bookings/${id}/cancel`),
```

No body. `req.body.reason` is `undefined`, trim produces `''`, and the 400 fires. The axios interceptor converts this to `new Error('A cancellation reason is required')`, which the catch blocks toast. The booking stays active. Both `MyBookingsPage` and `BookingDetailPage` use this path.

The simplest fix consistent with the server contract: add a `reason` parameter to `bookingsAPI.cancelBooking(id, reason)`, pass it as the request body, and collect it via a text input in the existing `ConfirmDialog`. Alternatively, remove the server-side requirement for customer-initiated cancels (the admin cancel route already doesn't require it separately).

</details>

---

<details>
<summary>Prior pass resolved issues (for reference)</summary>

All 9 issues from the prior review are confirmed fixed:

1. Dispatch gap — `getNearbyRequests` now queries `status: { $in: ['searching_partner', 'pending'] }`.
2. Partner name display — wizard reads `data.partnerName`; polling fallback checks `typeof b.partnerId === 'object'`.
3. `partners` socket room — `join:partners` handler guards on `socket.userRole === 'partner'`.
4. `rejectRequest` verification — isVerified check added, mirrors accept guard.
5. PWA icons — 192×192 (9.5 KB) and 512×512 (31 KB) real PNG files present.
6. Offline page — `sw.js` is a correct minimal SW, registered in `main.jsx`.
7. Socket.IO dev proxy — `/socket.io` with `ws: true` added to `vite.config.js`.
8. Status history timestamps — reads `entry.changedAt`; `entry.changedBy?.name` guarded correctly.
9. Price snapshot — reads `priceAtBooking` with `?? booking.service?.price` fallback.

</details>

---

<details>
<summary>File map</summary>

Files relevant to the two new findings:

- `server/src/controllers/serviceController.js` — `getServices` returns `{ data: Array }` (unchanged); shape mismatch is the root cause of issue 1.
- `server/src/controllers/bookingController.js` — `cancelBooking` requires non-empty `reason` (unchanged); creates the 400 condition for issue 2.
- `web/src/pages/customer/BookingWizard.jsx` — new in Phase 7; `fetchServices` reads `.services` on a bare array (issue 1).
- `web/src/api/bookings.js` — new in Phase 7; `cancelBooking` sends no body (issue 2).
- `web/src/pages/customer/MyBookingsPage.jsx` — modified in Phase 7; calls `cancelBooking(id)` without reason (issue 2).
- `web/src/pages/customer/BookingDetailPage.jsx` — modified in Phase 7; calls `cancelBooking(id)` without reason (issue 2).

Full diff: `git diff e7b2fa6 HEAD`

</details>
