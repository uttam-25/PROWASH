# PROWASH — Premium Vehicle Cleaning & Care

> Clean cars. Happy rides.

A full-stack mobile application for vehicle washing bookings, built with React Native (Expo SDK 51) and Node.js / Express / MongoDB.

---

## Architecture

```
Mobile (React Native / Expo)
        ↕ HTTP/JSON REST API
Backend (Node.js / Express / Mongoose)
        ↕ Mongoose ODM
MongoDB (local or Atlas)
```

- **Mobile** — Expo SDK 51, React Navigation v6, Axios, AsyncStorage / SecureStore
- **Backend** — Express 4, Mongoose 8, JWT auth, Razorpay payment gateway, Nodemailer
- **Database** — MongoDB (local dev or Atlas in production)

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9 |
| MongoDB | Local 6+ or Atlas |
| Expo CLI | `npm i -g expo-cli` |
| EAS CLI (builds only) | `npm i -g eas-cli` |

---

## Quick Start

### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET at minimum
npm run seed:admin      # creates the default admin account
npm run seed:services   # seeds default service catalogue
npm run dev             # starts on http://localhost:5000
```

Verify: `curl http://localhost:5000/api/health` → `{"status":"ok",...}`

### 2. Web Setup

In a second PowerShell window:

```powershell
Set-Location C:\path\to\PROWASH\web
npm install
npm run dev
```

Open `http://localhost:3000`. The Vite development server proxies `/api` requests to the backend on port 5000. Browser location detection is available on localhost and HTTPS origins.

### 3. Mobile Setup

```bash
cd mobile
npm install
cp .env.example .env
# Edit .env — set API_URL (see API URL Configuration below)
npx expo start          # opens Expo Dev Tools
```

Press `a` for Android emulator, `i` for iOS simulator, or scan the QR with Expo Go.

### 4. API URL Configuration

The mobile app reads `API_URL` from `mobile/.env`.

| Environment | Value |
|---|---|
| Android Emulator | `http://10.0.2.2:5000/api` |
| iOS Simulator | `http://localhost:5000/api` |
| Physical Device (same Wi-Fi) | `http://<LAN-IP>:5000/api` |
| Production | `https://api.yourdomain.com/api` |

**Finding your LAN IP:**
- Windows: `ipconfig` → look for `IPv4 Address` under your Wi-Fi adapter
- macOS/Linux: `ifconfig` or `ip addr` → look for `inet` on the `en0`/`wlan0` interface

---

## Booking and Partner Matching

Customers enter a structured service address (building, street, area, city, state and PIN code) during web booking. Browser location is requested only after the customer clicks **Use my current location**. The server uses OpenStreetMap Nominatim for reverse geocoding and to resolve manual addresses for nearby matching; no API key is required. If geocoding is temporarily unavailable, the booking and address are still saved, but nearby partner matching remains pending until valid coordinates are available. Set the optional `GEOCODING_USER_AGENT` and `GEOCODING_EMAIL` server environment variables to identify the application to the provider.

Only verified partners with a saved service location can go online. Configure supported vehicle types and washing services in the partner profile. New bookings are assigned to the nearest compatible online partner within 2 km when that partner has no overlapping assignment. If no partner is available, the booking remains pending and is retried when a partner comes online or completes/cancels a job.

---

## Environment Variables

### server/.env

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the Express server listens on | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/prowash` |
| `JWT_SECRET` | Secret used to sign JWT tokens — keep this strong and private | `supersecretkey` |
| `JWT_EXPIRE` | JWT expiry duration | `7d` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `ADMIN_EMAIL` | Email for the seeded admin account | `admin@prowash.com` |
| `ADMIN_PASSWORD` | Password for the seeded admin account | `Admin@1234` |
| `ADMIN_NAME` | Display name for the seeded admin | `ProWash Admin` |
| `EMAIL_HOST` | SMTP host for sending transactional emails | `smtp.mailtrap.io` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP username | `user@mailtrap.io` |
| `EMAIL_PASS` | SMTP password | `your_smtp_password` |
| `GEOCODING_USER_AGENT` | Descriptive identity for OpenStreetMap Nominatim | `PROWASH/1.0` |
| `GEOCODING_EMAIL` | Optional contact email sent with Nominatim requests | `support@prowash.com` |
| `RAZORPAY_KEY_ID` | Razorpay public API key | `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret API key | `your_key_secret` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret | `your_webhook_secret` |

### mobile/.env

| Variable | Description | Example |
|---|---|---|
| `API_URL` | Full base URL of the backend API (include `/api`) | `http://10.0.2.2:5000/api` |

---

## Default Admin Account

After running `npm run seed:admin` from the `server/` directory:

| Field | Value |
|---|---|
| Email | `admin@prowash.com` (or `ADMIN_EMAIL` from .env) |
| Password | `Admin@1234` (or `ADMIN_PASSWORD` from .env) |
| Role | `admin` |

---

## Building for Android

### Development Build (Expo Go)

```bash
cd mobile
npx expo start --android
```

Requires the Expo Go app on your device, or an Android emulator running.

### Preview APK (EAS Build)

```bash
cd mobile
eas build --platform android --profile preview
```

Produces a shareable `.apk` for testing without the Play Store.

### Production AAB (Google Play)

```bash
cd mobile
eas build --platform android --profile production
```

Produces an `.aab` for upload to Google Play Console.

### Local APK Build (no EAS account)

```bash
cd mobile
npx expo export --platform android   # bundles JS assets
# Then use Android Studio / Gradle to build the native wrapper
```

---

## Project Structure

```
PROWASH/
├── server/                   # Node.js / Express backend
│   ├── scripts/
│   │   ├── seedAdmin.js      # Seeds default admin user
│   │   └── seedServices.js   # Seeds default service catalogue
│   ├── src/
│   │   ├── app.js            # Express app setup, route mounts
│   │   ├── server.js         # HTTP server entry point
│   │   ├── controllers/      # Route handler logic
│   │   ├── middleware/        # Auth, error handling
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # Express routers
│   │   └── services/         # Business logic (availability, email, etc.)
│   ├── .env.example
│   └── package.json
│
└── mobile/                   # React Native / Expo app
    ├── App.js                # Root component
    ├── src/
    │   ├── components/       # Shared UI components
    │   ├── constants/        # App-wide constants (roles, etc.)
    │   ├── hooks/            # Custom React hooks
    │   ├── navigation/       # React Navigation navigators
    │   ├── screens/          # Screen components (auth, customer, admin)
    │   ├── services/         # API service layer (Axios)
    │   ├── theme/            # Colors, spacing, typography
    │   └── utils/            # Helpers (storage, formatting)
    ├── .env.example
    └── package.json
```

---

## API Documentation

All endpoints are prefixed with `/api`. Protected routes require a `Authorization: Bearer <token>` header.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Returns `{"status":"ok","timestamp":"..."}` |

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | None | Register a new customer account |
| POST | `/login` | None | Login; returns JWT token |
| GET | `/me` | Required | Get current authenticated user profile |
| POST | `/forgot-password` | None | Send password-reset email |
| POST | `/reset-password/:token` | None | Reset password using email token |
| PUT | `/change-password` | Required | Change password (requires old password) |
| POST | `/logout` | Required | Invalidate session (clears token on client) |

### Vehicles — `/api/vehicles`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List all vehicles belonging to current user |
| POST | `/` | Required | Add a new vehicle |
| PUT | `/:id` | Required | Update a vehicle |
| DELETE | `/:id` | Required | Delete a vehicle |

### Services — `/api/services`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | None | List all active services |
| GET | `/:id` | None | Get a single service by ID |

### Availability — `/api/availability`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | None | Get available time slots. Query params: `serviceId`, `date` (YYYY-MM-DD) |

### Bookings — `/api/bookings`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Required | Create a new booking |
| GET | `/` | Required | List all bookings for current user |
| GET | `/:id` | Required | Get a single booking by ID |
| PUT | `/:id/cancel` | Required | Cancel a booking |

### Payments — `/api/payments`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/razorpay/order` | Required | Create a Razorpay order for a booking |
| POST | `/razorpay/verify` | Required | Verify Razorpay payment signature |
| POST | `/webhook` | None | Razorpay webhook handler (signature-verified) |
| GET | `/` | Required | List all payments for current user |
| GET | `/:id` | Required | Get a single payment by ID |

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List notifications for current user |
| PUT | `/:id/read` | Required | Mark a notification as read |
| PUT | `/read-all` | Required | Mark all notifications as read |

### Admin — `/api/admin`

All admin routes require a valid JWT with `role: admin`.

**Dashboard & Reports**

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Summary counts and recent activity |
| GET | `/reports` | Full analytics: revenue, bookings by status/vehicle/service, monthly revenue |

**Bookings**

| Method | Path | Description |
|---|---|---|
| GET | `/bookings` | List all bookings (with filters) |
| GET | `/bookings/:id` | Get booking details |
| PUT | `/bookings/:id/status` | Update booking status |

**Schedule**

| Method | Path | Description |
|---|---|---|
| GET | `/schedule` | Get current schedule config |
| PUT | `/schedule` | Update schedule (hours, slot duration, capacity) |
| POST | `/schedule/block` | Block a time range |
| DELETE | `/schedule/block/:blockId` | Remove a blocked time range |
| POST | `/schedule/holiday` | Add a holiday date |
| DELETE | `/schedule/holiday/:date` | Remove a holiday date |

**Customers**

| Method | Path | Description |
|---|---|---|
| GET | `/customers` | List all customers |
| GET | `/customers/:id` | Get customer detail with booking history |

**Vehicles**

| Method | Path | Description |
|---|---|---|
| GET | `/vehicles` | List all vehicles across all customers |

**Services**

| Method | Path | Description |
|---|---|---|
| POST | `/services` | Create a new service |
| PUT | `/services/:id` | Update an existing service |
| DELETE | `/services/:id` | Delete (deactivate) a service |

**Payments**

| Method | Path | Description |
|---|---|---|
| GET | `/payments` | List all payments |
| POST | `/payments/:id/collect-cod` | Record a COD (Cash on Delivery) payment collection |

**Dev Only (NODE_ENV=development)**

| Method | Path | Description |
|---|---|---|
| POST | `/seed/services` | Seed default services (dev convenience) |

---

## Testing Guide

### 1. Start the backend

```bash
cd server && npm run dev
```

Check `GET /api/health` returns `{"status":"ok"}`.

### 2. Seed data

```bash
npm run seed:admin     # from server/
npm run seed:services  # from server/
```

### 3. Login as admin

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@prowash.com","password":"Admin@1234"}'
```

Copy the `token` from the response.

### 4. Verify services and reports

```bash
# Public services list
curl http://localhost:5000/api/services

# Admin reports (replace TOKEN)
curl http://localhost:5000/api/admin/reports \
  -H "Authorization: Bearer TOKEN"
```

### 5. Test booking flow (mobile)

1. Register a new customer account in the app
2. Add a vehicle (Profile → My Vehicles → Add)
3. Go to Home → Book a Wash
4. Select service, date, and time slot
5. Choose COD payment and confirm
6. Check Admin panel — booking appears in admin bookings list
7. Admin updates status to `confirmed`, then `in_progress`, then `completed`
8. Admin records COD collection via the payment details screen

---

## Payment Configuration

### COD (Cash on Delivery)

No configuration needed. Works out of the box. The customer selects "Pay on Arrival" at checkout. The admin marks the payment collected via **Admin → Payments → Collect COD**.

### Razorpay (Online Payments)

1. Create an account at [razorpay.com](https://razorpay.com)
2. Go to **Settings → API Keys** and generate a key pair
3. Set in `server/.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_key_secret
   ```
4. For webhooks:
   - In Razorpay Dashboard → **Settings → Webhooks**, add your server URL: `https://api.yourdomain.com/api/payments/webhook`
   - Select events: `payment.captured`, `payment.failed`
   - Copy the **Webhook Secret** and set `RAZORPAY_WEBHOOK_SECRET` in `.env`
5. In `mobile/.env`, the app uses `RAZORPAY_KEY_ID` from the backend response — no extra mobile config required.

> **Note:** In development, Razorpay webhooks require a publicly accessible URL. Use [ngrok](https://ngrok.com) to tunnel `localhost:5000`.

---

## Security Notes

- **Authentication** — JWT tokens (HS256), 7-day expiry by default. Tokens are stored in Expo SecureStore on mobile.
- **Passwords** — Hashed with bcryptjs (10 rounds). Plaintext passwords are never stored or logged.
- **Input validation** — All POST/PUT routes use `express-validator` for field validation before hitting the database.
- **Security headers** — `helmet` middleware sets appropriate HTTP security headers on every response.
- **CORS** — Currently set to `*` (allow all). Restrict `origin` in `server/src/app.js` for production.
- **Webhook verification** — The Razorpay webhook handler verifies HMAC-SHA256 signatures. If `RAZORPAY_WEBHOOK_SECRET` is not configured it returns 200 immediately to prevent infinite retries.
- **Role-based access** — Admin routes are protected by a `requireAdmin` middleware that checks `user.role === 'admin'` after JWT verification.

---

## Troubleshooting

### Metro bundler port conflict

```bash
npx expo start --port 8082
```

### Android emulator cannot reach backend

Use `10.0.2.2` instead of `localhost` — the Android emulator maps `10.0.2.2` to the host machine's loopback:

```
API_URL=http://10.0.2.2:5000/api
```

### Physical device cannot reach backend

Make sure both devices are on the same Wi-Fi network and use the host machine's LAN IP:

```
API_URL=http://192.168.1.XX:5000/api
```

Also check that your firewall allows inbound connections on port 5000.

### MongoDB connection error

- Verify MongoDB is running: `mongosh` or check the service status
- Check `MONGO_URI` in `server/.env`
- For Atlas: whitelist your IP in Atlas Network Access

### Expo SDK version mismatch

This project uses **Expo SDK 51** and **React Native 0.74.5**. If you see peer-dependency warnings, run:

```bash
cd mobile && npx expo install --fix
```

### Email not sending

Set `NODE_ENV=development` — the server will log email details to the console instead of failing silently when SMTP credentials are missing.
