# Implementation Plan — PROWASH Enhancements

Three features implemented in dependency order:
models → controllers → routes → frontend API files → frontend pages → App.jsx.

---

## FEATURE 1 — ONE VEHICLE PER CUSTOMER

- [ ] 1. **Update `Payment.js` model — add `pending_verification` status, `upi` method, and UPI audit fields**

  Extend the enums and add seven new optional fields to the schema.
  In `status` enum add `'pending_verification'`: `['unpaid', 'pending', 'pending_verification', 'paid', 'failed', 'refunded']`.
  In `method` enum add `'upi'`: `['cod', 'online', 'upi']`.
  After the `refundedAt` field (before the closing brace of the schema object) add:
  ```js
  upiConfirmedAt: { type: Date },
  upiRef: { type: String },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  ```
  Files: `server/src/models/Payment.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/models/Payment.js` — exits 0, no syntax errors.

- [ ] 2. **Update `Booking.js` model — add `upi` to `paymentMethod` and `pending_verification` to `paymentStatus`**

  In `paymentMethod` enum change `['cod', 'online']` to `['cod', 'online', 'upi']`.
  In `paymentStatus` enum change `['unpaid', 'pending', 'paid', 'failed', 'refunded']` to `['unpaid', 'pending', 'pending_verification', 'paid', 'failed', 'refunded']`.
  Files: `server/src/models/Booking.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/models/Booking.js` — exits 0.

- [ ] 3. **Update `validate.js` — add `upi` to `bookingRules` paymentMethod validation**

  In `bookingRules`, locate the `paymentMethod` body rule:
  ```js
  .isIn(['cod', 'online']).withMessage("paymentMethod must be 'cod' or 'online'")
  ```
  Change to:
  ```js
  .isIn(['cod', 'online', 'upi']).withMessage("paymentMethod must be 'cod', 'online', or 'upi'")
  ```
  Files: `server/src/middleware/validate.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/middleware/validate.js` — exits 0.

- [ ] 4. **Update `vehicleController.js` — add one-vehicle guard to `addVehicle` and add `replaceVehicle`**

  In `addVehicle`, insert this block BEFORE `Vehicle.create(...)`:
  ```js
  const existing = await Vehicle.findOne({ owner: req.user._id, isActive: true });
  if (existing) {
    return next(new AppError('You already have a registered vehicle. Update or replace it instead.', 409));
  }
  ```

  Add a new exported function at the bottom of the file (before the `lookupVehicleByReg` block is fine — keep imports together):
  ```js
  // ---------------------------------------------------------------------------
  // PUT /api/vehicles/replace  (protect)
  // ---------------------------------------------------------------------------
  export const replaceVehicle = async (req, res, next) => {
    try {
      // Soft-delete any existing active vehicle for this customer
      await Vehicle.updateMany({ owner: req.user._id, isActive: true }, { isActive: false });
      // Create the new vehicle
      const {
        type, make, model, year, licensePlate, color, photo,
        variant, vehicleClass, fuelType, registrationDate,
        registrationState, rtoCode, rtoName, manufacturingYear,
        emissionNorm, lookupProvider, lookupAt, lookupVerified,
      } = req.body;
      const vehicle = await Vehicle.create({
        owner: req.user._id,
        type, make, model, year, licensePlate, color, photo,
        variant, vehicleClass, fuelType, registrationDate,
        registrationState, rtoCode, rtoName, manufacturingYear,
        emissionNorm,
        lookupProvider: lookupProvider || 'manual',
        lookupAt: lookupAt || null,
        lookupVerified: lookupVerified || false,
      });
      res.status(201).json({ success: true, data: vehicle });
    } catch (err) {
      next(err);
    }
  };
  ```
  Files: `server/src/controllers/vehicleController.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/controllers/vehicleController.js` — exits 0.

- [ ] 5. **Update `vehicleRoutes.js` — import `replaceVehicle` and add `PUT /replace` route before `/:id`**

  In the import at the top, add `replaceVehicle` to the destructured imports from `../controllers/vehicleController.js`.

  Add the following route AFTER the `/my` and `/lookup` static routes and BEFORE `router.get('/:id', ...)`:
  ```js
  router.put('/replace', protect, validate(vehicleRules), replaceVehicle);
  ```
  The full order after the change must be:
  1. `router.post('/lookup', ...)` — already first
  2. `router.get('/my', ...)`
  3. `router.post('/', ...)` — addVehicle
  4. `router.put('/replace', ...)` — NEW, must come before /:id
  5. `router.get('/:id', ...)`
  6. `router.put('/:id', ...)`
  7. `router.delete('/:id', ...)`
  8. `router.get('/admin/vehicles', ...)`

  Files: `server/src/routes/vehicleRoutes.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/routes/vehicleRoutes.js` — exits 0.

---

## FEATURE 2 — QR PAYMENT PAGE

- [ ] 6. **Update `paymentController.js` — add `confirmUPIPayment`**

  Add this exported function at the end of the file (before the closing, after `updatePaymentStatus`):
  ```js
  // ---------------------------------------------------------------------------
  // POST /api/payments/confirm-upi  (protect)
  // ---------------------------------------------------------------------------
  export const confirmUPIPayment = async (req, res, next) => {
    try {
      const { bookingId, upiRef } = req.body;
      if (!bookingId) return next(new AppError('bookingId is required', 400));

      const booking = await Booking.findById(bookingId);
      if (!booking) return next(new AppError('Booking not found', 404));
      if (booking.customerId.toString() !== req.user._id.toString()) {
        return next(new AppError('Not authorised for this booking', 403));
      }

      let payment = await Payment.findOne({ bookingId });
      if (!payment) {
        payment = await Payment.create({
          bookingId,
          customerId: req.user._id,
          amount: booking.priceAtBooking,
          method: 'upi',
          status: 'pending_verification',
        });
      } else {
        if (['pending_verification', 'paid'].includes(payment.status)) {
          return next(new AppError('Payment confirmation already submitted or payment already verified.', 409));
        }
        payment.method = 'upi';
        payment.status = 'pending_verification';
      }
      payment.upiConfirmedAt = new Date();
      if (upiRef) payment.upiRef = upiRef;
      await payment.save();

      booking.paymentStatus = 'pending_verification';
      await booking.save();

      return res.json({ success: true, data: { status: 'pending_verification' } });
    } catch (err) {
      next(err);
    }
  };
  ```
  Files: `server/src/controllers/paymentController.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/controllers/paymentController.js` — exits 0.

- [ ] 7. **Update `paymentRoutes.js` — import and register `POST /confirm-upi` before `GET /:id`**

  Add `confirmUPIPayment` to the import from `../controllers/paymentController.js`.
  Add this route BEFORE `router.get('/:id', protect, getPayment)`:
  ```js
  router.post('/confirm-upi', protect, confirmUPIPayment);
  ```
  The ordering after change (avoiding `/:id` shadowing):
  1. `router.post('/webhook', ...)` — no auth, stays first
  2. `router.post('/create-order', ...)`
  3. `router.post('/verify', ...)`
  4. `router.post('/confirm-upi', protect, confirmUPIPayment)` — NEW
  5. `router.get('/my', ...)`
  6. `router.get('/:id', ...)` — must stay last among customer routes

  Files: `server/src/routes/paymentRoutes.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/routes/paymentRoutes.js` — exits 0.

---

## FEATURE 3 — ADMIN PAYMENT VERIFICATION

- [ ] 8. **Update `paymentController.js` — add `getPendingVerifications`, `verifyUPIPayment`, `rejectUPIPayment`**

  Append these three exported functions after `confirmUPIPayment` (all three are in the same file edit; do steps 6 and 8 as one file edit if convenient, or edit the file a second time):

  ```js
  // ---------------------------------------------------------------------------
  // GET /api/admin/payments/pending  (protect + requireAdmin)
  // ---------------------------------------------------------------------------
  export const getPendingVerifications = async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const skip = (page - 1) * limit;
      const filter = { status: 'pending_verification' };
      const total = await Payment.countDocuments(filter);
      const items = await Payment.find(filter)
        .populate('bookingId', 'bookingReference serviceNameSnapshot startAt priceAtBooking')
        .populate('customerId', 'name email phone')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit);
      res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
  };

  // ---------------------------------------------------------------------------
  // PATCH /api/admin/payments/:id/verify  (protect + requireAdmin)
  // ---------------------------------------------------------------------------
  export const verifyUPIPayment = async (req, res, next) => {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) return next(new AppError('Payment not found', 404));
      if (payment.status !== 'pending_verification') {
        return next(new AppError('Payment is not pending verification', 400));
      }
      payment.status = 'paid';
      payment.verifiedBy = req.user._id;
      payment.verifiedAt = new Date();
      await payment.save();
      await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });
      res.json({ success: true, data: payment });
    } catch (err) { next(err); }
  };

  // ---------------------------------------------------------------------------
  // PATCH /api/admin/payments/:id/reject  (protect + requireAdmin)
  // ---------------------------------------------------------------------------
  export const rejectUPIPayment = async (req, res, next) => {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) return next(new AppError('Payment not found', 404));
      if (payment.status !== 'pending_verification') {
        return next(new AppError('Payment is not pending verification', 400));
      }
      payment.status = 'unpaid';
      payment.rejectedBy = req.user._id;
      payment.rejectedAt = new Date();
      payment.rejectionReason = req.body.reason || '';
      await payment.save();
      await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'unpaid' });
      res.json({ success: true, data: payment });
    } catch (err) { next(err); }
  };
  ```
  Files: `server/src/controllers/paymentController.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/controllers/paymentController.js` — exits 0.

- [ ] 9. **Update `adminRoutes.js` — import and register pending/verify/reject payment routes**

  Add to the import at the top of the file (create a new import statement):
  ```js
  import {
    getPendingVerifications,
    verifyUPIPayment,
    rejectUPIPayment,
  } from '../controllers/paymentController.js';
  ```

  In the `// Payments` section, ADD these three lines BEFORE the existing
  `router.get('/payments', protect, requireAdmin, getPayments)` line:
  ```js
  router.get('/payments/pending', protect, requireAdmin, getPendingVerifications);
  router.patch('/payments/:id/verify', protect, requireAdmin, verifyUPIPayment);
  router.patch('/payments/:id/reject', protect, requireAdmin, rejectUPIPayment);
  ```
  The static `/payments/pending` route MUST appear before `/:id`-style routes.
  Final payments block order:
  1. `router.get('/payments/pending', ...)` — NEW
  2. `router.patch('/payments/:id/verify', ...)` — NEW
  3. `router.patch('/payments/:id/reject', ...)` — NEW
  4. `router.get('/payments', ...)` — existing
  5. `router.patch('/payments/:id/collect', ...)` — existing

  Files: `server/src/routes/adminRoutes.js`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/routes/adminRoutes.js` — exits 0.

- [ ] 10. **Full server import smoke-test**

  Run the dynamic import check to confirm all modules load without runtime errors:
  ```
  cd c:\Users\Dell\Desktop\PROWASH\server && node -e "import('./src/app.js').then(() => { console.log('OK'); process.exit(0) }).catch(e => { console.error(e.message); process.exit(1) })"
  ```
  Files: (no file changes — verification only)
  Verify: Command prints `OK` and exits 0.

---

## FRONTEND API FILES

- [ ] 11. **Update `web/src/api/vehicles.js` — add `replaceVehicle`**

  In the `vehiclesAPI` object, add after `updateVehicle`:
  ```js
  replaceVehicle: (data) => api.put('/vehicles/replace', toBackend(data)),
  ```
  Files: `web/src/api/vehicles.js`
  Verify: included in the Vite build check at step 15.

- [ ] 12. **Update `web/src/api/payments.js` — add `confirmUPI`**

  In `paymentsAPI`, add:
  ```js
  confirmUPI: (bookingId, upiRef = '') => api.post('/payments/confirm-upi', { bookingId, upiRef }),
  ```
  Files: `web/src/api/payments.js`
  Verify: included in the Vite build check at step 15.

- [ ] 13. **Update `web/src/api/admin.js` — add `getPendingPayments`, `verifyPayment`, `rejectPayment`**

  In `adminAPI`, add:
  ```js
  getPendingPayments: (params = {}) => api.get('/admin/payments/pending', { params }),
  verifyPayment: (id) => api.patch(`/admin/payments/${id}/verify`),
  rejectPayment: (id, reason) => api.patch(`/admin/payments/${id}/reject`, { reason }),
  ```
  Files: `web/src/api/admin.js`
  Verify: included in the Vite build check at step 15.

---

## FRONTEND PAGES

- [ ] 14. **Rewrite `MyVehiclesPage.jsx` — one-vehicle UI**

  Keep all existing imports. Add `RefreshCw`, `AlertTriangle` from `lucide-react` if needed for the replace confirmation UI.
  Replace the page component body (keep `VehicleForm` component as-is — it is already correct):

  **State changes:**
  - Keep: `loading`, `error`, `vehicles`, `submitting`, `deleting`
  - Add: `replaceOpen` (boolean — shows the full replace modal), `replaceConfirmOpen` (boolean — shows the warning dialog before replace), `editVehicle` (vehicle or null for edit modal), `deleteVehicle` (vehicle or null for confirm delete dialog)
  - Derive `myVehicle` from `vehicles`: `const myVehicle = vehicles.find(v => v.isActive !== false) || vehicles[0] || null`

  **`handleAdd`:** unchanged — calls `vehiclesAPI.addVehicle`. On 409 error, show `toast.error('You already have a vehicle registered.')` then call `fetchVehicles()`.

  **`handleReplace`:** new function:
  ```js
  async function handleReplace(data) {
    setSubmitting(true)
    try {
      await vehiclesAPI.replaceVehicle(data)
      toast.success('Vehicle replaced successfully!')
      setReplaceOpen(false)
      fetchVehicles()
    } catch (err) {
      toast.error(err.message || 'Failed to replace vehicle.')
    } finally {
      setSubmitting(false)
    }
  }
  ```

  **`handleEdit`:** unchanged — calls `vehiclesAPI.updateVehicle(editVehicle._id, data)`.

  **Render logic:**
  - Header: show `<h1>My Vehicle</h1>` and `<p>Your registered vehicle.</p>`. Show "Register Vehicle" button (`onClick={() => setAddOpen(true)}`) only when `!myVehicle`.
  - If loading: `<Spinner />`
  - If error: retry block
  - If `!myVehicle`: `<EmptyState>` with "Register Your Vehicle" button that sets `addOpen=true`
  - If `myVehicle`: single vehicle card (not a grid):
    ```
    Card content:
    - Icon (Car/Bike/Scooty based on vehicleType)
    - Registration number (font-mono, bold) + ShieldCheck badge if lookupVerified
    - Make + Model
    - Fuel type (if present)
    - Color swatch + label (if present)
    - Extra lookup fields (vehicleClass, rtoCode, registrationDate, manufacturingYear, emissionNorm) in a small gray box if any exist
    - Two action buttons:
        [Edit]    → setEditVehicle(myVehicle)
        [Replace] → setReplaceConfirmOpen(true)
    ```

  **Modals:**
  - Add modal (`addOpen`): `<VehicleForm onSubmit={handleAdd} loading={submitting} />` — same as before
  - Edit modal (`editVehicle`): `<VehicleForm defaultValues={editVehicle} onSubmit={handleEdit} loading={submitting} isEdit />` — same as before
  - Replace confirm: Use `<ConfirmDialog>` with title "Replace Vehicle", message "This will remove your current vehicle and replace it with a new one. Continue?", confirmLabel "Replace", onConfirm opens `setReplaceOpen(true)` and `setReplaceConfirmOpen(false)`
  - Replace modal (`replaceOpen`): `<VehicleForm onSubmit={handleReplace} loading={submitting} />` (isEdit=false so lookup is shown)
  - Delete confirm: keep existing `<ConfirmDialog>` for delete

  Files: `web/src/pages/customer/MyVehiclesPage.jsx`
  Verify: included in the Vite build check at step 15.

- [ ] 15. **Update `BookingWizard.jsx` — Step 2 auto-select and Step 5 UPI payment method**

  **Step 2 — auto-select when exactly 1 vehicle:**
  In `fetchVehicles()`, after `setVehicles(...)`, add:
  ```js
  // Auto-select single vehicle and advance
  const loaded = Array.isArray(raw) ? raw.map(fromBackend) : []
  if (loaded.length === 1) {
    setSelectedVehicle(loaded[0])
    setCurrentStep(3)
  }
  ```
  Note: `setVehicles` and the auto-select must both use the same local variable. Refactor to:
  ```js
  const loaded = Array.isArray(raw) ? raw.map(fromBackend) : []
  setVehicles(loaded)
  if (loaded.length === 1) {
    setSelectedVehicle(loaded[0])
    setCurrentStep(3)
  }
  ```

  **Step 2 — button label change:**
  Change `'+ Add New Vehicle'` button label to `'Register Your Vehicle'`.

  **Step 5 — add UPI payment option:**
  In the payment method button list, change the `map` source array from:
  ```js
  [
    { value: 'cod', label: 'Cash on Delivery' },
    { value: 'online', label: 'Online Payment' },
  ]
  ```
  to:
  ```js
  [
    { value: 'cod', label: 'Cash on Delivery' },
    { value: 'online', label: 'Online Payment' },
    { value: 'upi', label: 'UPI / QR Code' },
  ]
  ```

  **Step 5 — UPI info note:**
  After the payment method buttons, add:
  ```jsx
  {paymentMethod === 'upi' && (
    <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
      You'll be shown a QR code to scan after confirming.
    </p>
  )}
  ```

  **Step 5 — navigate to QR page on UPI booking:**
  In `handleConfirm`, replace:
  ```js
  setBookingResult(res.data.data?.booking || res.data.data)
  ```
  with:
  ```js
  const booking = res.data.data?.booking || res.data.data
  if (paymentMethod === 'upi' && booking._id) {
    navigate(`/dashboard/payment/${booking._id}`)
    return
  }
  setBookingResult(booking)
  ```

  Files: `web/src/pages/customer/BookingWizard.jsx`
  Verify: included in the Vite build check at step 17.

- [ ] 16. **Create `web/src/pages/customer/QRPaymentPage.jsx` (new file)**

  Create the file at `web/src/pages/customer/QRPaymentPage.jsx` with the following complete implementation:

  ```jsx
  import { useState, useEffect } from 'react'
  import { useParams, Link } from 'react-router-dom'
  import { Copy, CheckCircle, Clock, QrCode } from 'lucide-react'
  import toast from 'react-hot-toast'
  import { bookingsAPI } from '../../api/bookings'
  import { paymentsAPI } from '../../api/payments'
  import Spinner from '../../components/ui/Spinner'
  import Button from '../../components/ui/Button'
  import Badge from '../../components/ui/Badge'

  export default function QRPaymentPage() {
    const { bookingId } = useParams()
    const [booking, setBooking] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [qrImageMissing, setQrImageMissing] = useState(false)
    const [canConfirm, setCanConfirm] = useState(false)
    const [countdown, setCountdown] = useState(10)
    const [confirming, setConfirming] = useState(false)
    const [confirmed, setConfirmed] = useState(false)

    // Fetch booking
    useEffect(() => {
      async function fetchBooking() {
        setLoading(true)
        try {
          const res = await bookingsAPI.getBooking(bookingId)
          setBooking(res.data.data?.booking || res.data.data)
        } catch (err) {
          setError(err.message || 'Failed to load booking details.')
        } finally {
          setLoading(false)
        }
      }
      if (bookingId) fetchBooking()
    }, [bookingId])

    // 10-second countdown before enabling the confirm button
    useEffect(() => {
      if (!booking) return
      const interval = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(interval)
            setCanConfirm(true)
            return 0
          }
          return c - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }, [booking])

    function copyToClipboard(text, label) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success(`${label} copied!`)
      }).catch(() => {
        toast.error('Copy failed. Please copy manually.')
      })
    }

    async function handleConfirmPayment() {
      const amount = booking?.priceAtBooking
      const ok = window.confirm(
        `Have you completed the UPI payment of ₹${amount} to mr.uttama@ptyes?`
      )
      if (!ok) return

      setConfirming(true)
      try {
        await paymentsAPI.confirmUPI(bookingId, '')
        setConfirmed(true)
        toast.success('Payment confirmation submitted!')
      } catch (err) {
        toast.error(err.message || 'Failed to submit confirmation.')
      } finally {
        setConfirming(false)
      }
    }

    if (loading) return <div className="p-6"><Spinner message="Loading payment details..." /></div>

    if (error) {
      return (
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/dashboard/bookings"><Button variant="outline">My Bookings</Button></Link>
        </div>
      )
    }

    const paymentStatus = booking?.paymentStatus
    const alreadyHandled = ['pending_verification', 'paid'].includes(paymentStatus)

    return (
      <div className="p-6 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">PROWASH Payment</h1>
          <p className="text-gray-500 mt-1 font-mono text-sm">
            Ref: {booking?.bookingReference || bookingId}
          </p>
          <p className="text-3xl font-bold text-primary mt-2">
            ₹{Number(booking?.priceAtBooking || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-gray-500">{booking?.serviceNameSnapshot}</p>
        </div>

        {/* Payment status badge */}
        <div className="flex justify-center">
          <Badge status={paymentStatus || 'unpaid'} />
        </div>

        {/* QR Code */}
        <div className="card p-6 flex flex-col items-center gap-4">
          {qrImageMissing ? (
            <div className="w-48 h-48 border-2 border-amber-400 rounded-xl flex flex-col items-center justify-center bg-amber-50 text-center p-4">
              <QrCode className="w-10 h-10 text-amber-500 mb-2" />
              <p className="text-xs text-amber-700 font-medium">QR code image not configured.</p>
              <p className="text-xs text-amber-600 mt-1">
                Place your QR image at <code className="bg-amber-100 px-1 rounded">web/public/qr-payment.png</code> to enable QR display.
              </p>
            </div>
          ) : (
            <img
              src="/qr-payment.png"
              alt="UPI Payment QR Code"
              className="w-48 h-48 object-contain rounded-xl"
              onError={() => setQrImageMissing(true)}
            />
          )}

          <p className="text-sm text-gray-600 text-center">
            Scan the QR code using your preferred UPI app and complete the payment.
          </p>
        </div>

        {/* UPI Details */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Details</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">UPI ID</p>
              <p className="font-mono font-semibold text-gray-800">mr.uttama@ptyes</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard('mr.uttama@ptyes', 'UPI ID')}
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy UPI ID
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Amount</p>
              <p className="font-semibold text-gray-800">
                ₹{Number(booking?.priceAtBooking || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(String(booking?.priceAtBooking || ''), 'Amount')}
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy Amount
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 text-sm">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="font-medium text-gray-800">Uttama Choori</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bank</p>
              <p className="font-medium text-gray-800">State Bank of India (SBI)</p>
            </div>
          </div>
        </div>

        {/* Confirm Payment Button */}
        <div className="space-y-3">
          {alreadyHandled || confirmed ? (
            <div className="card p-5 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
              {paymentStatus === 'paid' || confirmed ? (
                <p className="font-semibold text-gray-800">
                  {paymentStatus === 'paid'
                    ? 'Payment Verified!'
                    : 'Your payment is pending verification by our team. We\'ll confirm within 24 hours.'}
                </p>
              ) : (
                <p className="font-semibold text-gray-800">
                  Payment is pending admin verification.
                </p>
              )}
            </div>
          ) : (
            <>
              {!canConfirm && (
                <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Please wait {countdown} second{countdown !== 1 ? 's' : ''} before confirming…
                </p>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={!canConfirm || confirming}
                loading={confirming}
                onClick={handleConfirmPayment}
              >
                I Have Completed Payment
              </Button>
            </>
          )}
        </div>

        <div className="text-center">
          <Link to="/dashboard/bookings" className="text-sm text-primary hover:underline">
            ← Back to My Bookings
          </Link>
        </div>
      </div>
    )
  }
  ```

  Files: `web/src/pages/customer/QRPaymentPage.jsx` (create new)
  Verify: included in the Vite build check at step 17.

- [ ] 17. **Enhance `AdminPaymentsPage.jsx` — add Pending UPI Verification section**

  Read the file first (already done). Do NOT rewrite the file — add to it:

  **Imports to add:** `{ RefreshCw, X }` from `lucide-react` (or `AlertTriangle` — whatever suits the reject icon).

  **Add to `METHOD_TABS`:** `{ value: 'upi', label: 'UPI' }` after the `online` entry.

  **Add to `STATUS_TABS`:** `{ value: 'pending_verification', label: 'Pending Verification' }` after `failed`.

  **New state variables** (add alongside existing state):
  ```js
  const [pendingPayments, setPendingPayments] = useState([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [verifying, setVerifying] = useState(null) // payment id being verified
  ```

  **New `fetchPendingPayments` function** (add alongside `fetchPayments`):
  ```js
  async function fetchPendingPayments() {
    setPendingLoading(true)
    setPendingError(null)
    try {
      const res = await adminAPI.getPendingPayments()
      const data = res.data.data
      setPendingPayments(data.items || [])
    } catch (err) {
      setPendingError(err.message || 'Failed to load pending payments.')
    } finally {
      setPendingLoading(false)
    }
  }
  ```

  **New `handleVerify` function**:
  ```js
  async function handleVerify(id) {
    setVerifying(id)
    try {
      await adminAPI.verifyPayment(id)
      toast.success('Payment verified!')
      fetchPendingPayments()
      fetchPayments()
    } catch (err) {
      toast.error(err.message || 'Failed to verify payment.')
    } finally {
      setVerifying(null)
    }
  }
  ```

  **New `handleReject` function**:
  ```js
  async function handleReject() {
    if (!rejectTarget) return
    setRejecting(true)
    try {
      await adminAPI.rejectPayment(rejectTarget._id, rejectReason)
      toast.success('Payment rejected.')
      setRejectTarget(null)
      setRejectReason('')
      fetchPendingPayments()
      fetchPayments()
    } catch (err) {
      toast.error(err.message || 'Failed to reject payment.')
    } finally {
      setRejecting(false)
    }
  }
  ```

  **Auto-fetch on mount + 30-second polling** (add a new `useEffect`):
  ```js
  useEffect(() => {
    fetchPendingPayments()
    const interval = setInterval(fetchPendingPayments, 30000)
    return () => clearInterval(interval)
  }, [])
  ```

  **Pending UPI section** — render ABOVE the existing Method Tabs `<div>` (i.e., as the first child after the page `<div>` header):
  ```jsx
  {/* Pending UPI Verification */}
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-semibold text-gray-800">Pending UPI Verification</h2>
      {pendingPayments.length > 0 && (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
          {pendingPayments.length}
        </span>
      )}
    </div>
    {pendingLoading ? (
      <Spinner message="Loading..." />
    ) : pendingError ? (
      <p className="text-red-600 text-sm">{pendingError}</p>
    ) : pendingPayments.length === 0 ? (
      <p className="text-sm text-gray-500">No pending UPI payments.</p>
    ) : (
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Customer</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Booking Ref</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Service</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Submitted At</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {pendingPayments.map(p => (
              <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-700">{p.customerId?.name || '—'}</td>
                <td className="py-3 px-4 font-mono text-xs text-gray-700">
                  {p.bookingId?.bookingReference || '—'}
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs">
                  {p.bookingId?.serviceNameSnapshot || '—'}
                </td>
                <td className="py-3 px-4 font-semibold text-gray-700">
                  ₹{Number(p.amount).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs">
                  {p.upiConfirmedAt ? format(parseISO(p.upiConfirmedAt), 'dd MMM yyyy, hh:mm a') : '—'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={verifying === p._id}
                      onClick={() => handleVerify(p._id)}
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRejectTarget(p); setRejectReason('') }}
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
  ```

  **Reject modal** — add BEFORE the existing `<ConfirmDialog>` at the bottom:
  ```jsx
  {/* Reject Modal */}
  {rejectTarget && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Reject Payment</h3>
        <p className="text-sm text-gray-600">
          Reject UPI payment from <strong>{rejectTarget.customerId?.name}</strong>?
        </p>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
          <textarea
            className="input w-full"
            rows={3}
            placeholder="e.g. Payment not received in account"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button loading={rejecting} onClick={handleReject}>Confirm Reject</Button>
        </div>
      </div>
    </div>
  )}
  ```

  **Fix error pattern** — Note: the existing `AdminPaymentsPage.jsx` uses `err.response?.data?.message` in two places (handleCollect and fetchPayments). Per the known constraint (axios interceptor re-throws as plain `Error(message)`), change those to `err.message`. Specifically:
  - In `fetchPayments` catch: `setError(err.message || 'Failed to load payments.')`
  - In `handleCollect` catch: `toast.error(err.message || 'Failed to record collection.')`

  Files: `web/src/pages/admin/AdminPaymentsPage.jsx`
  Verify: included in the Vite build check at step 18.

- [ ] 18. **Update `App.jsx` — add lazy import and route for `QRPaymentPage`**

  Add lazy import after the `ProfilePage` import line:
  ```js
  const QRPaymentPage = lazy(() => import('./pages/customer/QRPaymentPage'))
  ```

  In the customer `<Route path="/dashboard/*" ...>` block, add after the `<Route path="profile" ...>` line:
  ```jsx
  <Route path="payment/:bookingId" element={<QRPaymentPage />} />
  ```

  Files: `web/src/App.jsx`
  Verify: `cd c:\Users\Dell\Desktop\PROWASH\web && npm run build` — exits 0 with no TypeScript/Vite errors.

---

## FINAL VERIFICATION

- [ ] 19. **Run all verification checks in sequence**

  Run each command and confirm it exits 0:
  ```
  cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/controllers/paymentController.js
  cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/controllers/vehicleController.js
  cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/routes/vehicleRoutes.js
  cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/routes/paymentRoutes.js
  cd c:\Users\Dell\Desktop\PROWASH\server && node --check src/routes/adminRoutes.js
  cd c:\Users\Dell\Desktop\PROWASH\server && node -e "import('./src/app.js').then(() => { console.log('OK'); process.exit(0) }).catch(e => { console.error(e.message); process.exit(1) })"
  cd c:\Users\Dell\Desktop\PROWASH\web && npm run build
  ```

  Files: (no file changes — verification only)
  Verify: All commands exit 0. The Vite build produces no errors and the dist directory is populated.

---

## CHANGE SUMMARY (all files touched)

| # | File | Change Type |
|---|------|-------------|
| 1 | `server/src/models/Payment.js` | Edit — add enum values + 7 UPI fields |
| 2 | `server/src/models/Booking.js` | Edit — add `upi` to paymentMethod, `pending_verification` to paymentStatus |
| 3 | `server/src/middleware/validate.js` | Edit — bookingRules isIn add `upi` |
| 4 | `server/src/controllers/vehicleController.js` | Edit — addVehicle guard + replaceVehicle function |
| 5 | `server/src/routes/vehicleRoutes.js` | Edit — import + PUT /replace route |
| 6 | `server/src/controllers/paymentController.js` | Edit — add confirmUPIPayment, getPendingVerifications, verifyUPIPayment, rejectUPIPayment |
| 7 | `server/src/routes/paymentRoutes.js` | Edit — import + POST /confirm-upi route |
| 8 | `server/src/routes/adminRoutes.js` | Edit — import + 3 UPI admin routes |
| 9 | `web/src/api/vehicles.js` | Edit — add replaceVehicle |
| 10 | `web/src/api/payments.js` | Edit — add confirmUPI |
| 11 | `web/src/api/admin.js` | Edit — add getPendingPayments, verifyPayment, rejectPayment |
| 12 | `web/src/pages/customer/MyVehiclesPage.jsx` | Rewrite page component (keep VehicleForm) |
| 13 | `web/src/pages/customer/BookingWizard.jsx` | Edit — Step 2 auto-select + Step 5 UPI flow |
| 14 | `web/src/pages/customer/QRPaymentPage.jsx` | **Create new** |
| 15 | `web/src/pages/admin/AdminPaymentsPage.jsx` | Edit — add pending section + reject modal + fix error pattern |
| 16 | `web/src/App.jsx` | Edit — lazy import + route for QRPaymentPage |
