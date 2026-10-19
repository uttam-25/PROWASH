# PROWASH Phase 1 — Partner Portal, Socket.IO, and Admin Partner Management

This phase introduces the cleaning-partner role end-to-end: partner registration and login, a partner portal (dashboard, jobs, profile), Socket.IO for real-time booking events, and admin screens to list, verify, and deactivate partners. The backend adds `PartnerProfile`, `Review`, partner routes, and extends `Booking` with partner-tracking fields and a rich status machine.

**Watch for:** Admin dashboard stat cards are all broken due to a response-shape mismatch (confirmed, HIGH). There is no dedicated `GET /partner/jobs/:id` route, so `PartnerJobPage` fetches the entire job list and scans it client-side (confirmed, MEDIUM). Photo uploads save `blob:` object URLs instead of real storage URLs, so they are ephemeral and non-reproducible (confirmed, MEDIUM). Partner registration response wraps data inconsistently relative to the rest of the API (confirmed, LOW).

**Verdict**: NEEDS_CHANGES

---

## High-level view

The authorization stack is correct at every layer. `requirePartner` follows `protect` on all partner-only routes, admin routes use `requireAdmin`, and `ProtectedRoute` in the web layer redirects mismatched roles before rendering. The atomic accept-request using `findOneAndUpdate` with a compound filter on `{ _id, status: 'searching_partner', partnerId: null }` is the right pattern and correctly returns 409 when the race is lost.

The admin dashboard is broken out of the box. `getDashboard` returns a flat object directly under `data`, but the page reads `dashboard.stats.*` — a nested key that does not exist. Every stat card shows `—`. Additionally, `getDashboard` does not return `confirmedBookings`, `inProgressBookings`, or `completedToday`; those only exist in the `getReports` response. The page calls both endpoints but maps the wrong keys from the wrong source.

The partner job detail page (`PartnerJobPage`) has no single-job GET route to call. It loads all of the partner's jobs, searches the array by `_id`, and renders the match. As the partner's job history grows, this wastes bandwidth and becomes fragile. Adding `GET /partner/jobs/:bookingId` to the route table and a matching controller function is a one-hour fix that should happen before shipping.

Photo upload in `PartnerJobPage` calls `URL.createObjectURL()` on the selected file and immediately sends those blob URLs to the backend, which saves them as strings in MongoDB. Blob URLs are tab-scoped and revoked when the tab closes, so the stored values become dead references on the first page reload. A real upload path (cloud storage or a local multer endpoint) is needed before the photo feature is usable.

The `axios` response interceptor converts all API errors to `new Error(message)`, which means every `catch(err)` block only needs `err.message` — not the old `err.response?.data?.message` chain. All new pages (partner portal, admin partner screens) use `err.message` correctly. The previously broken pages (`MyBookingsPage`, `BookingDetailPage`, `ServicesPage`, `AdminDashboardPage`) were also updated and now use `err.message`.

The vehicle response fix — `vRes.data.data?.vehicles || vRes.data.data` — is applied in both `DashboardPage` and `BookingWizard`, handling the case where `data` is the array directly.

The admin status-transition table skips `confirmed → searching_partner`. An admin can move a non-immediate booking from `confirmed` straight to `in_progress`, bypassing the partner-assignment step. That may be intentional for manual dispatch, but it means a completed booking could have `partnerId: null`, causing a null-dereference in `updateJobStatus` earnings accounting (`PartnerProfile.findOneAndUpdate({ userId: req.user._id }, ...)` targets the partner's own ID, so the partner-side path is safe, but the admin-initiated jump is a logical gap to document or guard).

The `AdminDashboardPage` also reads `dashboard.recentBookings` from `getDashboard`, but that field is not in the dashboard response — `recentBookings` is only in `getReports`. The recent-bookings table will always be empty on the admin dashboard regardless of data in the database.

---

<details>
<summary>Issues (7)</summary>

1. **Admin dashboard stat cards always show `—`** — `getDashboard` returns a flat object under `data` but the page reads `dashboard?.stats`. All eight stat cards will be `—`. Fix: either remove the `?.stats` indirection (`const stats = dashboard || {}`) or move the fields into a `stats` subkey on the server response.

2. **Admin dashboard stats use wrong keys** — The page references `stats.todayBookings`, `stats.confirmedBookings`, `stats.inProgressBookings`, and `stats.completedToday`, none of which exist in `getDashboard`. `todayAppointments` is the server key; the other three only exist in `getReports`. Fix: align key names, or derive the missing breakdowns from `getReports` which already fetches them.

3. **Admin dashboard recent bookings always empty** — `dashboard?.recentBookings` is referenced but `getDashboard` does not include that field; `recentBookings` is under `getReports`. The table renders nothing. Fix: read `reports.recentBookings` instead.

4. **No `GET /partner/jobs/:id` endpoint** — `PartnerJobPage` fetches all jobs and scans the array to find the requested ID. Fix: add `router.get('/jobs/:bookingId', protect, requirePartner, getJobById)` and a matching controller that queries `Booking.findOne({ _id: bookingId, partnerId: req.user._id })`.

5. **Photo upload stores ephemeral blob URLs** — `URL.createObjectURL()` produces a tab-scoped reference that is invalidated on page close. The URLs are sent to the backend and persisted in MongoDB. Every stored photo reference becomes a dead link after the session. Fix: implement a real upload endpoint (multer + disk/S3) or a base64 path before enabling this feature.

6. **Admin status transition skips partner assignment** — `ALLOWED_TRANSITIONS` allows `confirmed → in_progress` directly, so an admin can complete a booking that has `partnerId: null`. The partner-side earnings update path is not affected, but downstream reads of `partnerId` on a completed booking return null. Fix: document this as a manual-dispatch path or add a guard that requires a partnerId for `in_progress` transitions.

7. **Partner registration response shape inconsistency** — `registerPartner` returns `{ success, token, user, data: { profile } }` while every other endpoint uses `{ success, data: { ... } }`. The token and user are at root level here but wrapped in `data` elsewhere. `PartnerRegisterPage` reads `res.data.token` and `res.data.user` so it works, but it is the only route in the codebase that breaks the contract. Fix: emit `{ success: true, token, data: { user: safeUser, profile } }` to match the auth pattern.

</details>

---

<details>
<summary>Details</summary>

### Status machine and admin transition gap

Partner-side transitions are constrained by `PARTNER_TRANSITIONS`: `partner_assigned → partner_on_way → partner_arrived → in_progress → completed`. Any attempt to jump steps returns a 400 with the valid transitions listed.

The admin-side table allows `confirmed → in_progress` directly, skipping partner assignment. The `searching_partner → partner_assigned` admin edge exists, so an admin can advance a booking that is already searching. The missing edge is `confirmed → searching_partner`, which would allow an admin to initiate partner-dispatch for a non-immediate booking without jumping straight to `in_progress`. The admin can also move `confirmed` to `in_progress` with `partnerId: null` on the booking — downstream reads of `partnerId` on that completed booking will return null.

### Admin dashboard response shape mismatch

`getDashboard` (confirmed from source):
```js
res.json({
  success: true,
  data: {
    totalBookings, pendingBookings, todayAppointments,
    totalRevenue, activeServices, totalCustomers,
  },
});
```

`AdminDashboardPage` reads:
```js
const stats = dashboard?.stats || {}   // dashboard.stats is undefined → {}
// All stat cards read stats.todayBookings, stats.confirmedBookings, etc.
// → all resolve to undefined → render '—'
```

And `dashboard?.recentBookings` — also absent from `getDashboard`; it lives in `getReports` which is already fetched into `reports`. The table only needs to read `reports.recentBookings`.

### Missing `GET /partner/jobs/:id` route

`PartnerJobPage` calls `partnerAPI.getJobs()` (no filter) then does `jobs.find(j => j._id === id)`. As the partner completes more jobs the payload grows unboundedly. More importantly, there is no guarantee the job in the correct status is included unless the `?status=` filter is not applied — and it isn't here, so this works for now, but the pattern is fragile and the O(n) scan will degrade over time. A dedicated single-job endpoint would also allow populating fields that are not returned in the list response.

### Photo upload lifecycle

`handleUpload` in `PhotoUploadSection`:
```js
const urls = files.map((f) => URL.createObjectURL(f))
await partnerAPI.uploadPhotos(bookingId, { type, urls })
```

`URL.createObjectURL` returns a `blob:http://…` URL local to the browser tab. The backend accepts any array of strings and appends them to `beforePhotos`/`afterPhotos` without validation. After a page refresh or tab close those blob references resolve to nothing. The feature should not be promoted as working until a real upload path is in place.

### Socket.IO integration

Both callers in `partnerController` wrap the dynamic `socketService` import in a bare `try/catch {}`, so a socket failure cannot bring down the HTTP response. The web layer dynamically imports `socket.io-client` in three places (`BookingWizard`, `PartnerJobPage`, `PartnerDashboardPage`), all with `.catch(() => {})`, so a CSP block or connection refusal degrades silently. A 10-second polling fallback runs in parallel in `BookingWizard`, so the customer sees booking status updates even when the socket cannot connect.

`PartnerDashboardPage` listens on both `partner:<id>` and the `partners` broadcast room for `new:request` events. The server currently never emits `new:request` to those rooms — `acceptRequest` only emits `booking:assigned` and `booking:status_update`. Partners see new requests only via the initial page load and the manual refresh triggered by accepting a job. This is a functional gap but not a correctness bug; new request delivery via socket is not yet wired server-side.

### PWA manifest icon risk

`manifest.json` references `/icons/icon-192.png` and `/icons/icon-512.png`. If those files do not exist under `web/public/icons/`, browsers will suppress the PWA install prompt with no visible error.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `server/src/models/User.js` | Added `'partner'` to role enum |
| `server/src/models/PartnerProfile.js` | New model — partner metadata, location, earnings, documents |
| `server/src/models/Review.js` | New model — per-booking 1–5 star review |
| `server/src/models/Booking.js` | Added partner tracking fields, extended status enum, statusHistory schema |
| `server/src/middleware/auth.js` | Added `requirePartner` middleware |
| `server/src/controllers/partnerController.js` | New controller — registration, profile, availability, request accept/reject, job status, photos |
| `server/src/routes/partnerRoutes.js` | New route file mounted at `/api/partner` |
| `server/src/app.js` | Mounted partner routes |
| `server/src/services/socketService.js` | New Socket.IO service — room-based emit helpers |
| `server/src/server.js` | Switched to `http.createServer` + `initSocket` |
| `server/src/controllers/adminController.js` | Added partner list, detail, verify, deactivate |
| `server/src/routes/adminRoutes.js` | Added `/admin/partners/*` routes |
| `server/scripts/seedServices.js` | Expanded service catalogue |
| `server/package.json` | Added `socket.io` |
| `web/index.html` | Added PWA meta tags |
| `web/public/manifest.json` | New PWA web app manifest |
| `web/public/offline.html` | New offline fallback page |
| `web/src/App.jsx` | Added partner routes and ProtectedRoute partner handling |
| `web/src/pages/customer/DashboardPage.jsx` | Rapido-style layout, vehicle response fix |
| `web/src/pages/customer/BookingWizard.jsx` | Socket.IO + polling real-time status tracking |
| `web/src/pages/customer/MyBookingsPage.jsx` | `err.message` fix |
| `web/src/pages/customer/BookingDetailPage.jsx` | `err.message` fix |
| `web/src/pages/customer/ServicesPage.jsx` | `err.message` fix |
| `web/src/pages/admin/AdminDashboardPage.jsx` | `err.message` fix (stats mapping remains broken) |
| `web/src/pages/admin/AdminPartnersPage.jsx` | New — paginated partner list with inline verify action |
| `web/src/pages/admin/AdminPartnerDetailPage.jsx` | New — partner detail, stats, documents, recent jobs |
| `web/src/pages/PartnerRegisterPage.jsx` | New partner registration form |
| `web/src/pages/PartnerLoginPage.jsx` | New partner login with role guard |
| `web/src/pages/partner/*.jsx` | New partner portal pages (dashboard, jobs list, job detail, profile) |
| `web/src/components/layout/PartnerLayout.jsx` | New sidebar layout for partner portal |
| `web/src/api/partner.js` | New API client methods for all partner endpoints |
| `web/package.json` | Added `socket.io-client` |

Full diff: `git diff main` from workspace root.

</details>
