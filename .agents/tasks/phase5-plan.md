# Phase 5 Implementation Plan — Payments & Notifications

> **Codebase facts confirmed during exploration:**
> - Notification model fields: `user`, `title`, `body`, `type` (free string), `isRead`, `data`
> - Payment model fields: `bookingId`, `customerId`, `amount`, `method` (cod/online), `status` (unpaid/pending/paid/failed/refunded) + gateway/refund fields
> - `paymentController.js` still uses old field names `customer`/`booking` — full replacement needed
> - `bookingController.js` creates Payment with `booking`/`customer` and `method: 'razorpay'` — both wrong
> - `notificationController.js` response wraps directly `{ success, data: notifications }` — no `unreadCount`, no pagination
> - `notificationRoutes.js` uses PUT for both read endpoints — needs PATCH
> - `notificationService.js` has only `createNotification` + `sendPushNotification` — no semantic helpers
> - `adminController.js` has `updateBookingStatus` using raw `Notification.create` and `recordCODCollection` using `Notification.create` — needs to switch to service helpers
> - `PaymentScreen.js` (mobile) is currently a full booking-creation screen — needs complete replacement
> - `BookWashScreen.js` step 4 has "Pay Online" chip disabled with `styles.paymentChipDisabled` + no-op — needs enablement and navigation fix
> - `CustomerNavigator.js` already registers `PaymentScreen` in `ServicesStack` as `"Payment"` — no nav changes needed
> - `CustomerHomeScreen.js` bell icon navigates to `NotificationsTab` but has no unread badge
> - `notificationService.js` (mobile) uses PUT for `markRead`/`markAllRead` — needs PATCH
> - `razorpay` is NOT in `server/package.json` — must be added
> - `server/.env.example` has no Razorpay keys — needs updating

---

## BACKEND TASKS

- [ ] 1. **Rewrite `server/src/services/notificationService.js`** — add semantic helper functions on top of the existing `createNotification` base.

      Keep `createNotification(userId, title, body, type, data)` and `sendPushNotification` exactly as-is.
      Add six fire-and-forget helper functions below them. Each calls `createNotification` with the correct user id, title, body, type, and `data: { bookingId: booking._id }`. All helpers are async and callers call them with `.catch(console.error)` — they must never throw to callers.

      Helper signatures and message text:
      - `notifyBookingCreated(booking, customer)` → title: `'Booking Received'`, body: `` `Your ${booking.serviceNameSnapshot} is pending confirmation.` ``, type: `'booking'`
      - `notifyBookingConfirmed(booking, customer)` → title: `'Booking Confirmed'`, body: `` `Your booking ${booking.bookingReference} has been confirmed.` ``, type: `'booking'`
      - `notifyBookingCancelled(booking, customer)` → title: `'Booking Cancelled'`, body: `` `Your booking ${booking.bookingReference} has been cancelled.` ``, type: `'booking'`
      - `notifyPaymentConfirmed(booking, customer)` → title: `'Payment Confirmed'`, body: `` `Payment for booking ${booking.bookingReference} has been received.` ``, type: `'payment'`
      - `notifyWashStarted(booking, customer)` → title: `'Wash Started'`, body: `` `Your wash for ${booking.serviceNameSnapshot} has started!` ``, type: `'booking'`
      - `notifyWashCompleted(booking, customer)` → title: `'Wash Completed'`, body: `` `Your ${booking.serviceNameSnapshot} is complete. Thank you!` ``, type: `'booking'`

      In every helper, `userId` is `booking.customerId` (the ObjectId already on the booking). The `customer` parameter is accepted but the userId is taken from `booking.customerId` so the helper works even when `customer` is not fully populated.

      Files: `server/src/services/notificationService.js`

      Verify: `cd server && node --input-type=module <<< "import * as s from './src/services/notificationService.js'; console.log(Object.keys(s).join(','))"` should print all six helper names plus `createNotification` and `sendPushNotification`. (Requires MONGO_URI in env — if not available, check for syntax errors only with `node --check src/services/notificationService.js`.)

---

- [ ] 2. **Update `server/src/controllers/notificationController.js`** — three changes:

      **`getMyNotifications`**: Add `?read=false` filter support and add `unreadCount` to response.
      ```
      const filter = { user: req.user._id };
      if (req.query.read === 'false') filter.isRead = false;
      const notifications = await Notification.find(filter).sort({ createdAt: -1 });
      const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
      res.json({ success: true, data: { notifications, unreadCount } });
      ```

      **`markRead`**: Change method comment from PUT to PATCH (no logic change — the route file controls method).

      **`markAllRead`**: Change to return `{ count }` of updated documents instead of a message string.
      ```
      const result = await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { $set: { isRead: true } }
      );
      res.json({ success: true, data: { count: result.modifiedCount } });
      ```

      Files: `server/src/controllers/notificationController.js`

      Verify: `node --check server/src/controllers/notificationController.js` exits 0.

---

- [ ] 3. **Update `server/src/routes/notificationRoutes.js`** — change PUT to PATCH and ensure order.

      Replace both `router.put` calls with `router.patch`. Keep `PATCH /read-all` before `PATCH /:id/read` to prevent Express matching `read-all` as an `:id` param.

      Final route list:
      ```
      router.get('/', protect, getMyNotifications);
      router.patch('/read-all', protect, markAllRead);
      router.patch('/:id/read', protect, markRead);
      ```

      Files: `server/src/routes/notificationRoutes.js`

      Verify: `node --check server/src/routes/notificationRoutes.js` exits 0.

---

- [ ] 4. **Full replacement of `server/src/controllers/paymentController.js`** — implement all four new functions and keep the three existing admin functions with corrected field names.

      **Imports needed:**
      ```js
      import crypto from 'crypto';
      import Booking from '../models/Booking.js';
      import Payment from '../models/Payment.js';
      import { AppError } from '../middleware/errorHandler.js';
      import { notifyPaymentConfirmed } from '../services/notificationService.js';
      ```

      **`createRazorpayOrder(req, res, next)`** — `POST /api/payments/create-order`:
      - Destructure `{ bookingId }` from `req.body`; return 400 if missing
      - `const booking = await Booking.findById(bookingId)`; 404 if not found
      - Verify `booking.customerId.toString() === req.user._id.toString()`; 403 if not
      - Verify `booking.paymentMethod === 'online'`; 400 if not
      - Verify `booking.paymentStatus` in `['unpaid', 'failed']`; 400 with message "Payment already processed" if not
      - `const razorpayConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)`
      - If NOT configured: `return res.status(503).json({ success: false, message: 'Online payments are not configured. Please use Cash on Delivery.', code: 'RAZORPAY_NOT_CONFIGURED' })`
      - If configured: dynamic import Razorpay, instantiate with key_id/key_secret, create order `{ amount: payment.amount * 100, currency: 'INR', receipt: bookingId }`, update Payment record `gatewayOrderId = order.id`, `status = 'pending'`, return `{ success: true, data: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, bookingReference: booking.bookingReference } }`
      - Load payment with `Payment.findOne({ bookingId })` before the Razorpay configured check

      **`verifyPayment(req, res, next)`** — `POST /api/payments/verify`:
      - Destructure `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }` from `req.body`
      - Load `const payment = await Payment.findOne({ gatewayOrderId: razorpay_order_id })`; 404 if not found
      - Verify `payment.customerId.toString() === req.user._id.toString()`; 403 if not
      - Compute expected signature: `crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')`
      - If signatures match: set `payment.status = 'paid'`, `payment.gatewayPaymentId = razorpay_payment_id`, `payment.gatewaySignature = razorpay_signature`, `payment.transactionReference = razorpay_payment_id`; save. Update booking: `await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' })`. Load booking for notification: `const booking = await Booking.findById(payment.bookingId)`; call `notifyPaymentConfirmed(booking, null).catch(console.error)`. Return `{ success: true, data: payment }`
      - If signatures do NOT match: set `payment.status = 'failed'`; save. Return `res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' })`

      **`handleWebhook(req, res, next)`** — `POST /api/payments/webhook` (no auth middleware):
      - Get signature from `req.headers['x-razorpay-signature']`
      - Compute HMAC-SHA256 of `JSON.stringify(req.body)` using `process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET`
      - If signature mismatch: return 400 `{ success: false, message: 'Invalid webhook signature' }`
      - Extract `event = req.body.event`, `paymentEntity = req.body.payload?.payment?.entity`
      - If `event === 'payment.captured'`: find payment by `gatewayOrderId = paymentEntity.order_id`; if found and status !== 'paid': set status='paid', gatewayPaymentId, transactionReference; save; update Booking paymentStatus='paid'; fire notifyPaymentConfirmed fire-and-forget
      - If `event === 'payment.failed'`: find payment by gatewayOrderId; if found: set status='failed'; save
      - If `event === 'refund.processed'`: find payment by gatewayPaymentId = `req.body.payload?.refund?.entity?.payment_id`; if found: set status='refunded', refundAmount, refundReason, refundedAt=new Date(); save
      - Always return `res.status(200).json({ received: true })`; wrap entire body in try/catch returning 200 on error too (webhook must always 200)

      **`getMyPayments(req, res, next)`** — `GET /api/payments/my` (paginated):
      - Page/limit from query, same pattern as `getAllPayments`
      - `filter = { customerId: req.user._id }`
      - Populate `bookingId` with fields: `bookingReference serviceNameSnapshot startAt status`
      - Sort `createdAt: -1`, paginated
      - Return `{ success: true, data: { payments, total, page, pages } }`

      **Keep existing `getPayment`, `getAllPayments`, `updatePaymentStatus`** but fix field names:
      - In `getPayment`: change `payment.customer` → `payment.customerId`; change `.populate('booking', ...)` → `.populate('bookingId', 'bookingReference serviceNameSnapshot startAt status')`
      - In `getAllPayments`: change `.populate('customer', ...)` → `.populate('customerId', 'name email phone')`; change `.populate({ path: 'booking', ... })` → `.populate({ path: 'bookingId', select: 'bookingReference serviceNameSnapshot startAt status' })`
      - In `updatePaymentStatus`: the validStatuses array should include `'unpaid'` as well: `['unpaid', 'pending', 'paid', 'failed', 'refunded']`; remove the `paidAt` field set (not in schema)

      Files: `server/src/controllers/paymentController.js`

      Verify: `node --check server/src/controllers/paymentController.js` exits 0.

---

- [ ] 5. **Update `server/src/routes/paymentRoutes.js`** — add new routes, fix import, correct order.

      Updated imports:
      ```js
      import {
        createRazorpayOrder,
        verifyPayment,
        handleWebhook,
        getMyPayments,
        getPayment,
        getAllPayments,
        updatePaymentStatus,
      } from '../controllers/paymentController.js';
      ```

      Route order (order matters — specific routes before `:id`):
      ```
      POST /webhook         → handleWebhook   (NO protect)
      POST /create-order    → protect, createRazorpayOrder
      POST /verify          → protect, verifyPayment
      GET  /my              → protect, getMyPayments
      GET  /:id             → protect, getPayment
      GET  /admin/payments  → protect, requireAdmin, getAllPayments
      PUT  /admin/payments/:id/status → protect, requireAdmin, updatePaymentStatus
      ```

      The webhook route MUST be first (no auth, needs raw body matching — note that `app.js` uses `express.json()` globally; this is acceptable for Razorpay webhook signature verification using `JSON.stringify(req.body)` which is the parsed-then-restringified body).

      Files: `server/src/routes/paymentRoutes.js`

      Verify: `node --check server/src/routes/paymentRoutes.js` exits 0.

---

- [ ] 6. **Fix `server/src/controllers/bookingController.js`** — three fixes:

      **Fix 1 — Payment creation in `createBooking`**: Replace the two wrong lines:
      ```js
      // OLD (wrong):
      const paymentMethod_mapped = paymentMethod === 'online' ? 'razorpay' : 'cod';
      await Payment.create({
        booking: booking._id,
        customer: req.user._id,
        amount: service.price,
        method: paymentMethod_mapped,
      });
      ```
      With:
      ```js
      // NEW (correct):
      await Payment.create({
        bookingId: booking._id,
        customerId: req.user._id,
        amount: service.price,
        method: paymentMethod,   // 'cod' or 'online' — matches schema enum
      });
      ```

      **Fix 2 — Replace inline `Notification.create` in `createBooking` with service call**: Remove the `Notification.create` block after payment creation and replace with:
      ```js
      notifyBookingCreated(booking, req.user).catch(console.error);
      ```
      Add `notifyBookingCreated` to the import from `../services/notificationService.js`. Remove the `import Notification` line (no longer needed in this file — verify no other usage first; `cancelBooking` and `rescheduleBooking` also use it — see Fix 3).

      **Fix 3 — Replace inline `Notification.create` calls in `cancelBooking` and `rescheduleBooking`**:
      - In `cancelBooking`: replace `await Notification.create({...})` with `notifyBookingCancelled(booking, req.user).catch(console.error)`. Import `notifyBookingCancelled` from notificationService.
      - In `rescheduleBooking`: the existing notification ("Booking Rescheduled") has no dedicated service helper — keep using `Notification.create` directly there, OR simply leave the existing inline Notification.create as-is for reschedule (it's fine). Keep the `import Notification` line since `rescheduleBooking` still uses it.

      Summary of imports at top of file: add `import { notifyBookingCreated, notifyBookingCancelled } from '../services/notificationService.js';`. Keep `import Notification from '../models/Notification.js';` since rescheduleBooking still uses it.

      Files: `server/src/controllers/bookingController.js`

      Verify: `node --check server/src/controllers/bookingController.js` exits 0.

---

- [ ] 7. **Update `server/src/controllers/adminController.js`** — wire notification helpers in two functions.

      **In `updateBookingStatus`**: Replace the single generic `await Notification.create({...})` block (the one that sends "Booking Update" with status text) with status-specific helpers. After `await booking.save()` and before the populate calls:
      ```js
      // Replace generic Notification.create with targeted helpers
      if (status === 'confirmed') {
        notifyBookingConfirmed(booking, null).catch(console.error);
      } else if (status === 'in_progress') {
        notifyWashStarted(booking, null).catch(console.error);
      } else if (status === 'completed') {
        notifyWashCompleted(booking, null).catch(console.error);
      } else {
        // cancelled/rejected — still notify generically
        Notification.create({
          user: booking.customerId,
          title: 'Booking Update',
          body: `Your booking ${booking.bookingReference} status is now: ${status.replace(/_/g, ' ')}.`,
          type: 'booking',
          data: { bookingId: booking._id },
        }).catch(console.error);
      }
      ```
      Note: the helpers use `booking.customerId` internally, so passing `null` for customer is safe.

      **In `recordCODCollection`**: After `await payment.save()` and the booking update block, replace the `await Notification.create({...})` with:
      ```js
      if (booking) {
        notifyPaymentConfirmed(booking, null).catch(console.error);
      }
      ```
      Remove the old `Notification.create` block entirely.

      Add import at top of file: `import { notifyBookingConfirmed, notifyWashStarted, notifyWashCompleted, notifyPaymentConfirmed } from '../services/notificationService.js';`

      Keep `import Notification from '../models/Notification.js';` since `updateBookingStatus` still uses it for the else branch.

      Files: `server/src/controllers/adminController.js`

      Verify: `node --check server/src/controllers/adminController.js` exits 0.

---

- [ ] 8. **Add `razorpay` package to server and update `.env.example`**.

      In `server/package.json`, add to `dependencies`:
      ```json
      "razorpay": "^2.9.2"
      ```

      In `server/.env.example`, append:
      ```
      RAZORPAY_KEY_ID=
      RAZORPAY_KEY_SECRET=
      RAZORPAY_WEBHOOK_SECRET=
      ```

      Then run `npm install` in the server directory.

      Files: `server/package.json`, `server/.env.example`

      Verify: `cd server && npm install` exits 0, and `node -e "import('razorpay')"` (or `node --input-type=module <<< "import Razorpay from 'razorpay'"`) succeeds without "Cannot find module" error.

---

## MOBILE TASKS

- [ ] 9. **Update `mobile/src/services/paymentService.js`** — add two new methods.

      Add after `getPayment`:
      ```js
      export async function createRazorpayOrder(bookingId) {
        const response = await api.post('/payments/create-order', { bookingId });
        return response.data;
      }

      export async function verifyPayment(data) {
        const response = await api.post('/payments/verify', data);
        return response.data;
      }
      ```

      Keep all four existing functions unchanged.

      Files: `mobile/src/services/paymentService.js`

      Verify: The file has no syntax errors — check visually or with `node --check` if using CJS; for ESM React Native modules, a successful `npx expo export --platform android` is the definitive check (run at the end).

---

- [ ] 10. **Update `mobile/src/services/notificationService.js`** — change PUT to PATCH, add `getNotifications`.

       Replace the entire file with:
       ```js
       import api from './api';

       export async function getNotifications(unreadOnly = false) {
         const params = unreadOnly ? { read: 'false' } : {};
         const response = await api.get('/notifications', { params });
         return response.data;
       }

       // Backwards-compat alias — existing callers use getMyNotifications()
       export async function getMyNotifications() {
         return getNotifications(false);
       }

       export async function markRead(id) {
         const response = await api.patch('/notifications/' + id + '/read');
         return response.data;
       }

       export async function markAllRead() {
         const response = await api.patch('/notifications/read-all');
         return response.data;
       }
       ```

       `NotificationsScreen` calls `getMyNotifications()` — the alias keeps it working. The new `getNotifications(true)` is used by `CustomerHomeScreen` for the badge count.

       Files: `mobile/src/services/notificationService.js`

       Verify: No syntax errors.

---

- [ ] 11. **Full replacement of `mobile/src/screens/customer/PaymentScreen.js`** — post-booking Razorpay screen.

       Route params received: `{ bookingId, bookingReference, amount, serviceName }`

       The screen has three UI states managed by a `screenState` variable (`'loading'`, `'cod_fallback'`, `'ready'`, `'error'`):

       **On mount (`useEffect` with `[bookingId]`):**
       1. Set state to `'loading'`
       2. Call `paymentService.createRazorpayOrder(bookingId)`
       3. If response has `code === 'RAZORPAY_NOT_CONFIGURED'` OR the HTTP status is 503 (catch `err.response?.status === 503`): set state to `'cod_fallback'`
       4. If network/other error: set `errorMessage` state and state to `'error'`
       5. If success: store the order data (`orderId`, `amount`, `currency`, `keyId`) in state; set state to `'ready'`

       **`'loading'` state:** Show `LoadingView` with message `"Preparing payment…"`

       **`'cod_fallback'` state:** Show a clean screen with:
       - `AppHeader` title `"Booking Confirmed"` with no back arrow (use `showBack={false}`)
       - A success icon (checkmark circle, green/ocean color)
       - `bookingReference` displayed prominently (large text)
       - Text: `"Your booking is confirmed. Please pay cash when the technician arrives."`
       - Amount: `"Amount due: ₹{amount}"`
       - Service name: `"{serviceName}"`
       - `AppButton` title `"View My Bookings"` → `navigation.navigate('BookingsTab')`

       **`'error'` state:** Show `ErrorView` with `onRetry` that re-runs the mount effect (use a `retryCount` state incremented on retry to re-trigger the effect).

       **`'ready'` state:** Show:
       - `AppHeader` title `"Complete Payment"` with back button
       - Amount card showing `"₹{amount}"` (use `amount` from route params, not `order.amount/100` to avoid paise confusion)
       - Service name and booking reference
       - Text block explaining: `"Tap 'Pay Now' to open the Razorpay checkout."`
       - A developer/test note box (styled differently, e.g., light yellow background) with text:
         `"Development mode: react-native-razorpay is not installed. Order ID: {orderId}"`
       - `AppButton` title `"View My Bookings"` → `navigation.navigate('BookingsTab')` as primary action
       - The "Pay Now" button is intentionally NOT implemented since `react-native-razorpay` is not installed — instead show the order ID info and the "View My Bookings" button so the user is never stuck

       **Important:** Never crash. Always show `bookingReference` in every non-loading state. Always provide a navigation path back.

       Use existing imports pattern: `AppHeader`, `AppButton`, `LoadingView`, `ErrorView` from `../../components/`, `colors`, `spacing`, `typography` from `../../theme/`, `* as paymentService from '../../services/paymentService'`.

       Files: `mobile/src/screens/customer/PaymentScreen.js`

       Verify: No syntax errors; screen renders without crash.

---

- [ ] 12. **Fix `mobile/src/screens/customer/BookWashScreen.js`** — enable online payment and fix post-booking navigation.

       **Fix 1 — Enable the "Pay Online" chip in `renderStep4`:**
       Replace the static non-interactive `<View>` for "Pay Online" with a pressable `<TouchableOpacity>` using the same active/inactive chip styling as the COD chip:
       ```jsx
       <TouchableOpacity
         style={[styles.paymentChip, paymentMethod === 'online' && styles.paymentChipActive]}
         onPress={() => setPaymentMethod('online')}
         accessibilityRole="radio"
         accessibilityLabel="Pay Online"
       >
         <Text style={[styles.paymentChipText, paymentMethod === 'online' && styles.paymentChipTextActive]}>
           Pay Online
         </Text>
       </TouchableOpacity>
       ```
       Remove `styles.paymentChipDisabled` and the `<Text style={styles.comingSoonBadge}>Coming Soon</Text>` line.

       **Fix 2 — Fix `handleConfirmBooking` post-booking navigation:**
       ```js
       const handleConfirmBooking = async () => {
         setIsSubmitting(true);
         setSlotError409(false);
         setSubmitError(null);
         try {
           const result = await bookingService.createBooking({
             vehicleId: selectedVehicle._id,
             serviceId: selectedService._id,
             startAt: selectedSlot.startAt,
             paymentMethod,
             notes: notes.trim() || undefined,
           });
           const booking = result.data;
           if (paymentMethod === 'online') {
             navigation.navigate('Payment', {
               bookingId: booking._id,
               bookingReference: booking.bookingReference,
               amount: selectedService.price,
               serviceName: selectedService.name,
             });
           } else {
             navigation.navigate('BookingSuccess', { booking: result.data });
           }
         } catch (err) {
           const status = err?.response?.status;
           if (status === 409) {
             setSlotError409(true);
           } else {
             setSubmitError(
               err?.response?.data?.message || 'Failed to create booking. Please try again.'
             );
           }
         } finally {
           setIsSubmitting(false);
         }
       };
       ```

       Note: `navigation.navigate('Payment', {...})` works because `PaymentScreen` is registered as `name="Payment"` in `ServicesStack` within `CustomerNavigator.js` — confirmed during exploration.

       Files: `mobile/src/screens/customer/BookWashScreen.js`

       Verify: No syntax errors.

---

- [ ] 13. **Add unread notification badge to `mobile/src/screens/customer/CustomerHomeScreen.js`**.

       **State additions** (at top of component, alongside existing state):
       ```js
       const [unreadCount, setUnreadCount] = useState(0);
       ```

       **Add import** at top: `import * as notificationService from '../../services/notificationService';`

       **Fetch unread count on focus** — add inside `useFocusEffect` callback (run fire-and-forget, does not block `loadData`):
       ```js
       notificationService.getNotifications(true)
         .then((data) => {
           setUnreadCount(data.data?.unreadCount ?? 0);
         })
         .catch(() => {}); // silent — badge is non-critical
       ```
       Place this call right after `loadData()` inside the `useFocusEffect` callback.

       **Update the bell icon `TouchableOpacity`** — wrap in a relative-position `View` and overlay the badge:
       ```jsx
       <TouchableOpacity
         onPress={() => navigation.navigate('NotificationsTab')}
         style={styles.headerBtn}
         accessibilityLabel="Notifications"
         accessibilityRole="button"
       >
         <Ionicons name="notifications-outline" size={22} color={colors.white} />
         {unreadCount > 0 && (
           <View style={styles.badge}>
             <Text style={styles.badgeText}>
               {unreadCount > 99 ? '99+' : unreadCount}
             </Text>
           </View>
         )}
       </TouchableOpacity>
       ```

       **Add badge styles** to the `StyleSheet.create` block:
       ```js
       badge: {
         position: 'absolute',
         top: 0,
         right: 0,
         minWidth: 16,
         height: 16,
         borderRadius: 8,
         backgroundColor: colors.error,
         alignItems: 'center',
         justifyContent: 'center',
         paddingHorizontal: 2,
       },
       badgeText: {
         color: colors.white,
         fontSize: 9,
         fontWeight: 'bold',
         lineHeight: 11,
       },
       ```

       Make `headerBtn` style position-relative by adding `position: 'relative'` to it (it already has `padding: spacing.sm`).

       Files: `mobile/src/screens/customer/CustomerHomeScreen.js`

       Verify: No syntax errors.

---

- [ ] 14. **Update `mobile/src/screens/customer/NotificationsScreen.js`** — align with new service API.

       The screen already calls `notificationService.getMyNotifications()` which now delegates to `getNotifications(false)` via the alias — no change needed for that call.

       The screen already handles `data.notifications || data.data || []` for the response. The new API returns `{ success, data: { notifications, unreadCount } }` so `data.notifications` will be populated — confirmed compatible.

       The screen computes `unreadCount` locally from the array — that is fine (leave it).

       The screen calls `notificationService.markRead(id)` and `notificationService.markAllRead()` — these now use PATCH via the updated service — no screen change needed.

       **One change needed:** The `loadNotifications` function does:
       ```js
       const data = await notificationService.getMyNotifications();
       setNotifications(data.notifications || data.data || []);
       ```
       With the new response shape `{ success: true, data: { notifications, unreadCount } }`, `data` here is the entire response body. So `data.notifications` is `undefined` and `data.data` = `{ notifications, unreadCount }` — the fallback `data.data` returns the object, not the array. Fix:
       ```js
       const data = await notificationService.getMyNotifications();
       setNotifications(data.data?.notifications || data.notifications || []);
       ```

       Files: `mobile/src/screens/customer/NotificationsScreen.js`

       Verify: No syntax errors.

---

## VERIFICATION

- [ ] 15. **Server smoke test** — verify server starts and key endpoints behave correctly.

       ```
       cd c:\Users\Dell\Desktop\PROWASH\server
       node src/server.js
       ```
       Expected: prints `Server running on port 5000` (or configured port) and `MongoDB connected`.

       Then test (in a second terminal or with curl):
       ```
       # Health check
       curl http://localhost:5000/api/health

       # Notification endpoint with ?read=false (expects 401 without token — proves route exists)
       curl http://localhost:5000/api/notifications?read=false

       # Payment create-order (expects 401 — proves route exists, not 404)
       curl -X POST http://localhost:5000/api/payments/create-order

       # Payment webhook (no auth — expects 400 bad signature, not 404 or 500)
       curl -X POST http://localhost:5000/api/payments/webhook -H "Content-Type: application/json" -d "{}"
       ```

       Files: none (verification only)

       Verify: Server starts without import/syntax errors. Routes return 401 (auth required) or 400 (bad input) rather than 404 or 500.

---

- [ ] 16. **Mobile bundle check** — verify the React Native app bundles without errors.

       ```
       cd c:\Users\Dell\Desktop\PROWASH\mobile
       npx expo export --platform android
       ```

       Expected: exits 0. Any error indicates a missing import, syntax error, or broken navigation reference that must be fixed before Phase 5 is considered complete.

       Files: none (verification only)

       Verify: `npx expo export --platform android` exits 0.

---

## Summary of files changed

| # | File | Change type |
|---|------|-------------|
| B1 | `server/src/services/notificationService.js` | Add 6 helper functions |
| B2 | `server/src/controllers/notificationController.js` | Update 3 handlers |
| B3 | `server/src/routes/notificationRoutes.js` | PUT → PATCH |
| B4 | `server/src/controllers/paymentController.js` | Full replacement |
| B5 | `server/src/routes/paymentRoutes.js` | Add 3 routes, fix imports |
| B6 | `server/src/controllers/bookingController.js` | Fix Payment fields, wire notifications |
| B7 | `server/src/controllers/adminController.js` | Wire notification helpers |
| B8 | `server/package.json` + `server/.env.example` | Add razorpay dep + env keys |
| M1 | `mobile/src/services/paymentService.js` | Add 2 methods |
| M2 | `mobile/src/services/notificationService.js` | Add getNotifications, PATCH |
| M3 | `mobile/src/screens/customer/PaymentScreen.js` | Full replacement |
| M4 | `mobile/src/screens/customer/BookWashScreen.js` | Enable online, fix nav |
| M5 | `mobile/src/screens/customer/CustomerHomeScreen.js` | Unread badge |
| M6 | `mobile/src/screens/customer/NotificationsScreen.js` | Fix response parsing |
