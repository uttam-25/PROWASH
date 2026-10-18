# PROWASH Phase 2 — Implementation Plan

## Discoveries from codebase exploration

**Response shape** (all APIs): `{ success: true, data: {...} }` on success; `{ success: false, message: '...' }` on error. Validation failures return `{ success: false, errors: [{field, message}] }` (shape set by validate.js).

**API base URL gotcha**: `api.js` sets `baseURL: 'http://localhost:5000/api'`. Every service call must use paths like `/vehicles/my`, `/services`, `/bookings` — never `/api/vehicles/my`.

**Validate middleware pattern**: `validate(rulesArray)` spreads the array then appends the result-checking middleware. To add new validation rules, create named rule arrays in `validate.js` and pass them to `validate()` in the route file.

**Error pattern**: Controllers catch errors and call `next(err)`. Throw `new AppError(message, statusCode)` for domain errors. Let Mongoose errors bubble — `errorHandler.js` handles CastError (404), duplicate key (400), and ValidationError (400).

**Phase 1 bug fixes** (must be applied before new work):
1. `ConfirmDialog.js` line 90: `shadowColor: '#000'` → `shadowColor: colors.black`
2. `server/src/middleware/auth.js` catch block: add `if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return next(new AppError('Invalid or expired token', 401))` before `next(err)`.

---

## Implementation Order (dependency-ordered)

### FEAT-001 — Phase 1 bug fixes (prerequisite for everything)

- [ ] 1. Fix `ConfirmDialog.js` `shadowColor: '#000'` → `colors.black`.
      Files: `mobile/src/components/ConfirmDialog.js`
      Verify: `cd mobile && npx expo export --platform android` exits 0.

- [ ] 2. Fix JWT error handling in `protect` middleware.
      Files: `server/src/middleware/auth.js`
      Verify: `cd server && node src/server.js` starts; expired/invalid token returns 401 not 500.

---

### FEAT-002 — Backend: Models, Services, Routes

- [ ] 3. Create `Vehicle` model.
      Schema fields: `owner` (ObjectId ref User, required), `type` (enum Car/Bike/Scooty/SUV/Truck/Van), `make`, `model`, `year`, `licensePlate` (optional), `color` (optional), `photo` (optional URL string), `isActive` (bool, default true), timestamps.
      Files: `server/src/models/Vehicle.js`
      Verify: server starts without error.

- [ ] 4. Create `Service` model.
      Schema: `name`, `description`, `category` (exterior/interior/full/premium), `vehicleTypes` ([String]), `price` (Number), `duration` (minutes, Number), `isActive` (bool, default true), `imageUrl` (optional), timestamps.
      Files: `server/src/models/Service.js`
      Verify: server starts without error.

- [ ] 5. Create `Schedule` model.
      Schema: `date` (Date, required), `maxBookings` (Number, default 10), `bookedCount` (Number, default 0), `slots` ([{ time: String, available: Boolean }]), `isOpen` (Boolean, default true), timestamps.
      Files: `server/src/models/Schedule.js`
      Verify: server starts without error.

- [ ] 6. Create `Booking` model.
      Schema: `customer` (ref User), `vehicle` (ref Vehicle), `service` (ref Service), `status` (enum: pending/confirmed/in_progress/completed/cancelled, default pending), `scheduledDate` (Date), `scheduledTime` (String), `totalAmount` (Number), `notes` (String optional), `cancelReason` (String optional), timestamps.
      Files: `server/src/models/Booking.js`
      Verify: server starts without error.

- [ ] 7. Create `Payment` model.
      Schema: `booking` (ref Booking, required), `customer` (ref User), `amount` (Number), `method` (enum: cod/razorpay), `status` (enum: pending/paid/failed/refunded, default pending), `razorpayOrderId` (String optional), `razorpayPaymentId` (String optional), `paidAt` (Date optional), timestamps.
      Files: `server/src/models/Payment.js`
      Verify: server starts without error.

- [ ] 8. Create `Notification` model.
      Schema: `user` (ref User), `title`, `body`, `type` (String), `isRead` (bool, default false), `data` (Mixed optional), timestamps.
      Files: `server/src/models/Notification.js`
      Verify: server starts without error.

- [ ] 9. Create `availabilityService.js` in `server/src/services/`.
      Exports: `getAvailableSlots(date)` — queries or creates a Schedule doc for the given date and returns available time slots. Default slots: every 30 min from 08:00–18:00. Returns `[{ time: '08:00', available: true }, ...]`.
      Files: `server/src/services/availabilityService.js`
      Verify: server starts without error.

- [ ] 10. Create vehicle controller and routes.
       Controller methods (all use `protect`):
       - `getMyVehicles` — GET `/api/vehicles/my` — returns `req.user`'s vehicles.
       - `addVehicle` — POST `/api/vehicles` — creates vehicle with `owner: req.user._id`.
       - `getVehicle` — GET `/api/vehicles/:id` — returns vehicle if owner matches.
       - `updateVehicle` — PUT `/api/vehicles/:id` — updates if owner matches.
       - `deleteVehicle` — DELETE `/api/vehicles/:id` — soft-delete (`isActive: false`) if owner matches.
       Admin methods (add `requireAdmin` after `protect`):
       - `getAllVehicles` — GET `/api/admin/vehicles` — paginated list with customer populated.
       Add validation rules to validate.js: `vehicleRules` (type required, make/model required strings).
       Files: `server/src/controllers/vehicleController.js`, `server/src/routes/vehicleRoutes.js`, `server/src/middleware/validate.js`
       Verify: `node src/server.js` starts; `curl http://localhost:5000/api/health` returns 200.

- [ ] 11. Create service (wash service) controller and routes.
       Controller methods:
       - `getServices` — GET `/api/services` — public, returns active services.
       - `getService` — GET `/api/services/:id` — public.
       - `createService` — POST `/api/admin/services` — admin only.
       - `updateService` — PUT `/api/admin/services/:id` — admin only.
       - `deleteService` — DELETE `/api/admin/services/:id` — admin only, soft delete.
       Add validation rules: `serviceRules` (name, price, duration required).
       Files: `server/src/controllers/serviceController.js`, `server/src/routes/serviceRoutes.js`, `server/src/middleware/validate.js`
       Verify: server starts.

- [ ] 12. Create availability controller and routes.
       Controller methods:
       - `getAvailability` — GET `/api/availability?date=YYYY-MM-DD` — calls `availabilityService.getAvailableSlots(date)`, protected.
       Admin:
       - `setSchedule` — POST `/api/admin/schedule` — create/update a Schedule doc for a date (set maxBookings, isOpen, slots override).
       Files: `server/src/controllers/availabilityController.js`, `server/src/routes/availabilityRoutes.js`
       Verify: server starts.

- [ ] 13. Create booking controller and routes.
       Customer methods:
       - `createBooking` — POST `/api/bookings` — validates vehicle ownership, service exists, slot is available, creates Booking + Payment(pending,cod) doc, increments `Schedule.bookedCount`.
       - `getMyBookings` — GET `/api/bookings/my` — returns customer's bookings populated (service, vehicle).
       - `getBooking` — GET `/api/bookings/:id` — returns if `booking.customer == req.user._id`.
       - `cancelBooking` — PUT `/api/bookings/:id/cancel` — sets status cancelled, decrements bookedCount, requires `cancelReason`.
       Admin methods:
       - `getAllBookings` — GET `/api/admin/bookings` — paginated, filterable by status/date.
       - `updateBookingStatus` — PUT `/api/admin/bookings/:id/status` — sets status (confirmed/in_progress/completed/cancelled).
       Add validation rules: `bookingRules` (vehicleId, serviceId, scheduledDate, scheduledTime required).
       Files: `server/src/controllers/bookingController.js`, `server/src/routes/bookingRoutes.js`, `server/src/middleware/validate.js`
       Verify: server starts.

- [ ] 14. Create payment controller and routes.
       Customer:
       - `getMyPayments` — GET `/api/payments/my`.
       - `getPayment` — GET `/api/payments/:id` — if customer matches.
       Admin:
       - `getAllPayments` — GET `/api/admin/payments` — paginated.
       - `updatePaymentStatus` — PUT `/api/admin/payments/:id/status`.
       Files: `server/src/controllers/paymentController.js`, `server/src/routes/paymentRoutes.js`
       Verify: server starts.

- [ ] 15. Create customer controller and routes (admin-side customer management).
       Admin:
       - `getAllCustomers` — GET `/api/admin/customers` — paginated list of role:customer users.
       - `getCustomer` — GET `/api/admin/customers/:id` — customer details with their bookings.
       - `toggleCustomerActive` — PUT `/api/admin/customers/:id/toggle` — flip `isActive`.
       Files: `server/src/controllers/customerController.js`, `server/src/routes/customerRoutes.js`
       Verify: server starts.

- [ ] 16. Create notification controller and routes.
       - `getMyNotifications` — GET `/api/notifications` — protected, returns user's notifications sorted newest first.
       - `markRead` — PUT `/api/notifications/:id/read`.
       - `markAllRead` — PUT `/api/notifications/read-all`.
       Update `notificationService.js` to actually create Notification documents in the DB when `sendPushNotification` is called, in addition to the console log.
       Files: `server/src/controllers/notificationController.js`, `server/src/routes/notificationRoutes.js`, `server/src/services/notificationService.js`
       Verify: server starts.

- [ ] 17. Create admin reports route.
       - `getReports` — GET `/api/admin/reports` — returns: total bookings count, bookings by status, revenue total, today's bookings, revenue this month, total customers.
       Files: `server/src/controllers/adminController.js`, `server/src/routes/adminRoutes.js`
       Verify: server starts.

- [ ] 18. Wire all new routes into `app.js`.
       Add imports and `app.use(...)` calls for: vehicleRoutes, serviceRoutes, availabilityRoutes, bookingRoutes, paymentRoutes, customerRoutes (admin), notificationRoutes, adminRoutes.
       Files: `server/src/app.js`
       Verify: `node src/server.js` starts; `curl /api/health` returns 200.

---

### FEAT-003 — Backend: User profile update route

- [ ] 19. Add `updateProfile` and `changePassword` to `authController.js`.
       - `PUT /api/auth/profile` — protected, allows updating `name`, `phone`, `avatar`. Never allows changing `email` or `role`.
       - `PUT /api/auth/change-password` — protected, verifies current password then sets new password.
       Add validation rules: `updateProfileRules`, `changePasswordRules`.
       Files: `server/src/controllers/authController.js`, `server/src/routes/authRoutes.js`, `server/src/middleware/validate.js`
       Verify: server starts.

---

### FEAT-004 — Mobile: Service layer

- [ ] 20. Create `vehicleService.js`.
       Functions: `getMyVehicles()`, `addVehicle(data)`, `getVehicle(id)`, `updateVehicle(id, data)`, `deleteVehicle(id)`.
       All call `api.{method}('/vehicles/...')` — no `/api` prefix in path.
       Files: `mobile/src/services/vehicleService.js`
       Verify: no import errors; `npx expo export` exits 0.

- [ ] 21. Create `serviceService.js`.
       Functions: `getServices()`, `getService(id)`.
       Files: `mobile/src/services/serviceService.js`
       Verify: `npx expo export` exits 0.

- [ ] 22. Create `bookingService.js`.
       Functions: `createBooking(data)`, `getMyBookings()`, `getBooking(id)`, `cancelBooking(id, reason)`, `getAvailability(date)`.
       Files: `mobile/src/services/bookingService.js`
       Verify: `npx expo export` exits 0.

- [ ] 23. Create `paymentService.js`.
       Functions: `getMyPayments()`, `getPayment(id)`.
       Files: `mobile/src/services/paymentService.js`
       Verify: `npx expo export` exits 0.

- [ ] 24. Create `notificationService.js` (mobile).
       Functions: `getMyNotifications()`, `markRead(id)`, `markAllRead()`.
       Files: `mobile/src/services/notificationService.js`
       Verify: `npx expo export` exits 0.

- [ ] 25. Update `authService.js` to add `updateProfile(data)` and `changePassword(data)` calls.
       Files: `mobile/src/services/authService.js`
       Verify: `npx expo export` exits 0.

---

### FEAT-005 — Mobile: Shared components for Phase 2

- [ ] 26. Create `ServiceCard.js` component.
       Props: `service` (object), `onPress`. Shows service name, category badge, price, duration, and vehicle type chips. Uses `colors`, `spacing`, `typography`.
       Files: `mobile/src/components/ServiceCard.js`
       Verify: `npx expo export` exits 0.

- [ ] 27. Create `VehicleCard.js` component.
       Props: `vehicle` (object), `onPress`, `onEdit`, `onDelete` (optional). Shows type icon, make/model, license plate badge, color dot. Uses `colors`, `spacing`, `typography`.
       Files: `mobile/src/components/VehicleCard.js`
       Verify: `npx expo export` exits 0.

- [ ] 28. Create `BookingCard.js` component.
       Props: `booking` (object), `onPress`. Shows service name, scheduled date/time, vehicle, `StatusBadge`, amount.
       Files: `mobile/src/components/BookingCard.js`
       Verify: `npx expo export` exits 0.

---

### FEAT-006 — Mobile: Customer screens

- [ ] 29. Implement `MyVehiclesScreen.js`.
       FlatList of VehicleCards with pull-to-refresh. FAB or header button to navigate to `AddVehicle`. ConfirmDialog for delete. EmptyState when no vehicles.
       Files: `mobile/src/screens/customer/MyVehiclesScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 30. Implement `AddVehicleScreen.js` and `EditVehicleScreen.js`.
       Form: type picker (VEHICLE_TYPES from constants), make, model, year, licensePlate, color. Expo ImagePicker for optional vehicle photo. Submits to vehicleService. Shows validation errors inline. Uses `AppInput`, `AppButton`.
       Files: `mobile/src/screens/customer/AddVehicleScreen.js`, `mobile/src/screens/customer/EditVehicleScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 31. Implement `ServicesScreen.js` and `ServiceDetailsScreen.js`.
       Services: FlatList of ServiceCards, grouped by category. Pull-to-refresh. Filter bar (all/exterior/interior/full/premium). ServiceDetails: full description, price, duration, vehicle types, "Book This Service" button.
       Files: `mobile/src/screens/customer/ServicesScreen.js`, `mobile/src/screens/customer/ServiceDetailsScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 32. Implement the booking flow screens.
       `BookWashScreen.js`: vehicle picker (from user's vehicles) + service picker if not already selected.
       `SelectDateTimeScreen.js`: calendar-style date picker (use `date` state + simple month view with TouchableOpacity cells), then fetches available slots from `getAvailability(date)` and renders time slot chips.
       `BookingReviewScreen.js`: shows selected vehicle, service, date/time, total price. "Confirm Booking" calls `createBooking`.
       `PaymentScreen.js`: shows payment method selection (COD or Razorpay placeholder). COD confirms immediately. Razorpay shows placeholder screen with note about merchant account requirement.
       `BookingSuccessScreen.js`: success confirmation with booking ID, estimated time, "View My Bookings" CTA.
       Files: `mobile/src/screens/customer/BookWashScreen.js`, `mobile/src/screens/customer/SelectDateTimeScreen.js`, `mobile/src/screens/customer/BookingReviewScreen.js`, `mobile/src/screens/customer/PaymentScreen.js`, `mobile/src/screens/customer/BookingSuccessScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 33. Implement `MyBookingsScreen.js` and `BookingDetailsScreen.js`.
       MyBookings: FlatList of BookingCards, status filter tabs (All/Pending/Confirmed/Completed/Cancelled), pull-to-refresh, EmptyState.
       BookingDetails: full booking info, vehicle details, service details, payment status, "Cancel Booking" button with reason input + ConfirmDialog (only for pending/confirmed).
       Files: `mobile/src/screens/customer/MyBookingsScreen.js`, `mobile/src/screens/customer/BookingDetailsScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 34. Implement `NotificationsScreen.js`.
       FlatList of notifications, unread count badge, "Mark All Read" action. Pull-to-refresh. Tap marks individual notification read.
       Files: `mobile/src/screens/customer/NotificationsScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 35. Implement `ProfileScreen.js` and `EditProfileScreen.js`.
       Profile: shows user avatar (placeholder initials if no image), name, email, phone, member since. Links to EditProfile, change password (modal or separate screen). Logout button with ConfirmDialog.
       EditProfile: form for name, phone, avatar (ImagePicker). Submits to `updateProfile`.
       Files: `mobile/src/screens/customer/ProfileScreen.js`, `mobile/src/screens/customer/EditProfileScreen.js`
       Verify: `npx expo export` exits 0.

---

### FEAT-007 — Mobile: Customer Navigator (complete bottom tabs)

- [ ] 36. Update `CustomerNavigator.js` to full bottom-tab implementation with 5 tabs:
       Home, Services, Book (center CTA tab), Bookings, Profile.
       Register all customer screens as stack navigators nested inside tabs where needed (Services has ServiceDetails pushed; Bookings has BookingDetails pushed; Profile has EditProfile pushed).
       Book tab navigates directly to `BookWashScreen`.
       Register AddVehicle, EditVehicle in the Home tab stack.
       Files: `mobile/src/navigation/CustomerNavigator.js`
       Also update `RootNavigator.js` to remove the old single-screen `CustomerHome` registration.
       Verify: `npx expo export` exits 0.

- [ ] 37. Upgrade `CustomerHomeScreen.js` (replace stub with full implementation).
       Show greeting, hero card, user's vehicles (2 most recent), recent bookings (3 most recent), featured services (3 active). All loaded via service calls on mount. LoadingView while loading. Pull-to-refresh. Quick action buttons to navigate to key screens.
       Files: `mobile/src/screens/customer/CustomerHomeScreen.js`
       Verify: `npx expo export` exits 0.

---

### FEAT-008 — Mobile: Admin screens and navigator

- [ ] 38. Update `AdminNavigator.js` to a full stack-based drawer or bottom-tab admin layout.
       Decision: use bottom tabs for admin (matches spec for smaller screens) with tabs: Dashboard, Bookings, Services, Customers, More (stack for reports/payments/schedule/settings).
       Register all admin screens.
       Files: `mobile/src/navigation/AdminNavigator.js`
       Verify: `npx expo export` exits 0.

- [ ] 39. Upgrade `AdminHomeScreen.js` with live stats.
       Fetch real stats from `/api/admin/reports`. Show today's bookings, pending count, revenue, customer count. Recent bookings list (5 most recent).
       Files: `mobile/src/screens/admin/AdminHomeScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 40. Implement `AdminBookingsScreen.js` and `AdminBookingDetailsScreen.js`.
       AdminBookings: FlatList, status filter tabs, search by customer name, pull-to-refresh.
       AdminBookingDetails: full booking info, status update picker (confirm/in_progress/complete/cancel), customer and vehicle info.
       Add admin booking service calls in `bookingService.js` (or a new `adminService.js`): `getAdminBookings(params)`, `updateBookingStatus(id, status)`.
       Files: `mobile/src/screens/admin/AdminBookingsScreen.js`, `mobile/src/screens/admin/AdminBookingDetailsScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 41. Implement `AdminServicesScreen.js`, `AddServiceScreen.js`, `EditServiceScreen.js`.
       AdminServices: list of all services with active/inactive toggle, FAB to add. AddService/EditService: form for name, description, category, vehicleTypes (multi-select), price, duration, imageUrl.
       Add admin service calls to `serviceService.js`: `createService(data)`, `updateService(id, data)`, `deleteService(id)`.
       Files: `mobile/src/screens/admin/AdminServicesScreen.js`, `mobile/src/screens/admin/AddServiceScreen.js`, `mobile/src/screens/admin/EditServiceScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 42. Implement `AdminCustomersScreen.js` and `AdminCustomerDetailsScreen.js`.
       AdminCustomers: paginated list, search, show status badges.
       AdminCustomerDetails: profile info, booking history, activate/deactivate toggle with ConfirmDialog.
       Add admin customer service calls: `getAdminCustomers(params)`, `getAdminCustomer(id)`, `toggleCustomerActive(id)`.
       Files: `mobile/src/screens/admin/AdminCustomersScreen.js`, `mobile/src/screens/admin/AdminCustomerDetailsScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 43. Implement `AdminPaymentsScreen.js`.
       Paginated list of all payments with method, status, amount, customer name. Status update (mark paid for COD). Pull-to-refresh.
       Add admin payment service calls to `paymentService.js`: `getAdminPayments(params)`, `updatePaymentStatus(id, status)`.
       Files: `mobile/src/screens/admin/AdminPaymentsScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 44. Implement `AdminCalendarScreen.js` and `AdminScheduleScreen.js`.
       AdminCalendar: month view showing booking counts per day. Tap day to see bookings for that day.
       AdminSchedule: manage availability for a selected date — set max bookings, open/close day, manage time slots.
       Add availability service calls to `bookingService.js` or new `adminService.js`: `getAdminSchedule(date)`, `setAdminSchedule(date, data)`.
       Files: `mobile/src/screens/admin/AdminCalendarScreen.js`, `mobile/src/screens/admin/AdminScheduleScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 45. Implement `AdminReportsScreen.js`.
       Fetches `/api/admin/reports`. Shows total bookings, revenue, status breakdown, top services. Use horizontal bar-style views built from View/Text (no chart lib needed — native bar proportions via flex widths).
       Files: `mobile/src/screens/admin/AdminReportsScreen.js`
       Verify: `npx expo export` exits 0.

- [ ] 46. Implement `AdminVehiclesScreen.js` and `AdminSettingsScreen.js`.
       AdminVehicles: searchable paginated list of all vehicles with customer info.
       AdminSettings: show current admin profile, quick links (change password), app version info.
       Files: `mobile/src/screens/admin/AdminVehiclesScreen.js`, `mobile/src/screens/admin/AdminSettingsScreen.js`
       Verify: `npx expo export` exits 0.

---

## Key gotchas summary

1. **API paths in mobile services**: `api.js` baseURL is `http://localhost:5000/api`. All service file calls use paths without `/api` prefix: `/vehicles/my`, `/bookings`, `/services`, etc.
2. **ES modules on server**: All server files use `import`/`export`. No `require()`. File extensions must be `.js` with explicit import paths including `.js`.
3. **Role security**: Vehicle ownership check must compare `vehicle.owner.toString() === req.user._id.toString()` (ObjectId comparison). Never trust `req.body.owner`.
4. **Booking slot decrement**: When booking is cancelled, always decrement `Schedule.bookedCount` and re-open the slot if it was marked unavailable.
5. **Expo export for verification**: Run `cd mobile && npx expo export --platform android` to verify no import/compile errors — does not require a running server.
6. **Mobile date handling**: Use JS `Date` objects; format dates as `YYYY-MM-DD` strings for API params. No external date library is installed.
7. **ImagePicker**: `expo-image-picker` is already in `mobile/package.json`. For vehicle photos, request permission with `ImagePicker.requestMediaLibraryPermissionsAsync()` before launching.
8. **No TypeScript**: All new files must be `.js`, not `.ts` or `.tsx`.
9. **Colors.black**: Use `colors.black` from theme, never `'#000'` — this was the Phase 1 bug.
10. **Admin service calls**: Admin API paths follow the pattern `/admin/bookings`, `/admin/services`, `/admin/customers`, `/admin/payments`, `/admin/reports`, `/admin/vehicles`, `/admin/schedule`.
