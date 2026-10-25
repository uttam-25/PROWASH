# PROWASH Enhancement: One-Vehicle Enforcement, UPI/QR Payment, and Admin Verification

Three features land together: a per-customer vehicle limit enforced at the server, a UPI/QR payment page with manual admin verification, and an admin panel section for reviewing pending payments. The approach is conservative — customer clicks "I Have Completed Payment" → status becomes `pending_verification` → admin manually promotes or rejects. No money moves without a human check.

Watch for: (1) **confirmed** — `confirmUPIPayment` is a find-then-create with no atomic guard, making it vulnerable to a duplicate-submission race that bypasses the 409 duplicate check; (2) **confirmed** — `verifyUPIPayment` and `rejectUPIPayment` fire no customer notification, leaving the customer with no feedback after admin action; (3) **confirmed** — `QRPaymentPage` calls `confirmUPI` with an empty `upiRef` string and no prompt for a transaction ID, making rejected payments unverifiable without external evidence.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The one-vehicle guard in `addVehicle` uses `findOne` + `create` without a transaction. In normal usage this is fine, but concurrent requests from the same customer can both pass the `findOne` check before either has written, resulting in two active vehicle documents. The `unique: true` index on `Payment.bookingId` will catch a similar race on the payment side at the database level, but no such uniqueness constraint exists on `Vehicle` for the `(owner, isActive)` combination.

The UPI payment flow is structurally correct: `confirmUPIPayment` checks booking ownership, gates on `paymentMethod === 'upi'`, and sets status to `pending_verification` — never `paid`. The `verifyUPIPayment` and `rejectUPIPayment` admin handlers are registered at `/api/admin/payments/:id/verify|reject`, behind `requireAdmin`, and placed before the generic `GET /payments` route so the named segment isn't shadowed. The two-step route ordering concern (named routes before `:id` wildcards) is handled correctly in both `vehicleRoutes.js` and `adminRoutes.js`.

The admin payment page polls `getPendingPayments` every 30 seconds and provides inline Verify/Reject controls. The reject flow captures a reason string. Neither the verify nor the reject path in `paymentController.js` calls any notification service, so customers find out their payment was reviewed only by refreshing the booking page themselves.

The `QRPaymentPage` imposes a 10-second countdown before the confirm button becomes active, uses `onError` on the `<img>` to fall back to a UPI card, and hardcodes the correct UPI ID, name, and bank. The page correctly sits inside the authenticated `CustomerLayout` at `/dashboard/payment/:bookingId`. One operational gap: the page calls `confirmUPI(bookingId, '')` — the `upiRef` is always empty because there is no input for the customer to enter their UPI transaction reference. When an admin rejects a payment, there is no transaction ID to cross-check.

---

<details>
<summary>Issues (4)</summary>

1. **No-transaction vehicle guard** — `addVehicle` does `findOne` then `create` without a session; two concurrent requests from the same customer can both pass the `findOne` and produce duplicate active vehicles. Either add a `unique` index on `(owner, isActive: true)` with a sparse partial index, or wrap in a transaction matching the pattern already used in `replaceVehicle`. [confirmed]

2. **No-transaction UPI confirmation** — `confirmUPIPayment` does `findOne` then conditional `create`/`save` with no session. The `unique: true` constraint on `Payment.bookingId` will turn a concurrent race into a MongoDB duplicate-key error (500) rather than a clean 409. Wrap the find+create block in a session and handle the duplicate-key error explicitly. [confirmed]

3. **No customer notification on verify/reject** — `verifyUPIPayment` and `rejectUPIPayment` update the database but call no notification service. The customer only discovers the outcome by re-visiting the booking page. `confirmUPIPayment` should similarly call `notifyPaymentConfirmed` (or an equivalent reject notification) to close the feedback loop. [confirmed]

4. **upiRef always empty** — `QRPaymentPage` calls `paymentsAPI.confirmUPI(bookingId, '')`. Customers are never asked to enter their UPI transaction reference (UTR/transaction ID). Without this, an admin rejecting a payment has no cross-reference to check against a bank statement. Add a text input on the QRPaymentPage for the optional transaction reference before the confirm step. [confirmed]

</details>

---

<details>
<summary>Details</summary>

## One-vehicle guard: race window in `addVehicle`

`addVehicle` runs `Vehicle.findOne({ owner, isActive: true })` and, if nothing is found, proceeds to `Vehicle.create(...)`. These are two separate database round-trips with no lock between them. A customer who taps the button twice in quick succession — or whose client retries a timed-out request — can produce two concurrent requests that both clear the `findOne` before either write lands. The result is two active vehicle documents for the same owner.

`replaceVehicle` already uses `mongoose.startSession()` + `updateMany`/`create` in a transaction. The same pattern should be applied to `addVehicle`: open a session, do the `findOne` inside it with `{ session }`, and only `create` if still nothing is found. An alternative is a partial unique index (`unique: true` on `owner` where `isActive = true`), which MongoDB enforces atomically and makes the application code simply handle the duplicate-key error.

## UPI confirmation race and duplicate-key error surface

`confirmUPIPayment` is structured as:
1. `findOne({ bookingId })` → if null, `create(...)` with `status: 'pending_verification'`
2. If found, check status and update

The `Payment` schema has `bookingId: { unique: true }`, so a concurrent race where both requests pass step 1 simultaneously will cause the second `create` to throw a MongoDB duplicate-key error (E11000), which bubbles as an unhandled 500 rather than a user-friendly 409. The fix is either a `findOneAndUpdate` with `upsert` (atomic) or wrapping the block in a transaction. The 409 check in the `else` branch only fires when the record already exists at the time of the first `findOne`; it does not protect the window between the check and the write.

## No customer notification after admin verify/reject

`verifyUPIPayment` saves the payment and calls `Booking.findByIdAndUpdate(...)` to flip `paymentStatus` to `paid`. It does not call `notifyPaymentConfirmed` or any equivalent. `rejectUPIPayment` also makes no notification call. Contrast with the Razorpay path, which calls `notifyPaymentConfirmed` after both the webhook and the client-side verify. The UPI path is a regression on the notification contract. Customers who submitted a UPI payment are left waiting with no push or email until they manually check.

## Empty transaction reference in QRPaymentPage

The page renders an optional `upiRef` text field in the spec but the implementation passes an empty string unconditionally: `paymentsAPI.confirmUPI(bookingId, '')`. The `Payment.upiRef` field exists in the schema, and `confirmUPIPayment` will store it if non-empty (`if (upiRef) payment.upiRef = upiRef`), but the frontend never populates it. Admins viewing a pending payment in `AdminPaymentsPage` see no transaction reference, making it impossible to match the claim against a bank statement without calling the customer directly.

## Security posture

`confirmUPIPayment` verifies `booking.customerId.toString() !== req.user._id.toString()` before allowing confirmation — ownership is enforced. `verifyUPIPayment` and `rejectUPIPayment` are both registered under `requireAdmin` in `adminRoutes.js` and are absent from `paymentRoutes.js`, so no customer-facing path can call them. No payment is ever set to `paid` by any customer action. The `updatePaymentStatus` function in `paymentController.js` that accepts arbitrary status values from a request body is not exposed by any currently registered route, so it poses no active risk.

UPI ID, account name, and bank name are hardcoded in `QRPaymentPage.jsx` as module-level constants, which is appropriate — no API keys or secrets are present in the frontend.

## Route ordering

`PUT /api/vehicles/replace` is registered before `GET /:id` and `PUT /:id` in `vehicleRoutes.js`. `GET /api/admin/payments/pending` is registered before the generic `PATCH /api/admin/payments/:id/verify` wildcard in `adminRoutes.js`. Both orderings are correct.

## Build evidence

No build output or test run results were found in the repository. Per the review instructions, this is noted as a finding: **build evidence missing** — the review is based on static analysis only.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `server/src/models/Payment.js` | Added `upi` to `method` enum; added `pending_verification` to `status` enum; added UPI audit fields (`upiConfirmedAt`, `upiRef`, `verifiedBy`, `verifiedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`) |
| `server/src/models/Booking.js` | Added `upi` to `paymentMethod` enum; added `pending_verification` to `paymentStatus` enum |
| `server/src/middleware/validate.js` | Added `'upi'` to `bookingRules` `paymentMethod` enum |
| `server/src/controllers/vehicleController.js` | Added one-vehicle guard to `addVehicle`; added `replaceVehicle` (transaction-wrapped); added `lookupVehicleByReg` |
| `server/src/controllers/paymentController.js` | Added `confirmUPIPayment`, `getPendingVerifications`, `verifyUPIPayment`, `rejectUPIPayment` |
| `server/src/routes/vehicleRoutes.js` | Added `PUT /replace`, `POST /lookup` routes (correctly ordered before `/:id`) |
| `server/src/routes/paymentRoutes.js` | Added `POST /confirm-upi` |
| `server/src/routes/adminRoutes.js` | Added `GET /payments/pending`, `PATCH /payments/:id/verify`, `PATCH /payments/:id/reject` (correctly ordered before generic payment routes) |
| `web/src/api/vehicles.js` | Added `replaceVehicle`, `lookupByReg` methods |
| `web/src/api/payments.js` | Added `confirmUPI` method |
| `web/src/api/admin.js` | Added `getPendingPayments`, `verifyPayment`, `rejectPayment` methods |
| `web/src/pages/customer/MyVehiclesPage.jsx` | Rewritten to single-vehicle UI with edit/replace flow |
| `web/src/pages/customer/BookingWizard.jsx` | Added UPI payment option; added post-booking navigation to `/dashboard/payment/:bookingId` |
| `web/src/pages/customer/QRPaymentPage.jsx` | New page — QR display, 10s countdown, payment confirmation |
| `web/src/pages/admin/AdminPaymentsPage.jsx` | Added "Pending UPI Verification" section with verify/reject controls and 30s auto-refresh |
| `web/src/App.jsx` | Registered `QRPaymentPage` at `/dashboard/payment/:bookingId` |

Full diff not available (review conducted from source files directly).

</details>
