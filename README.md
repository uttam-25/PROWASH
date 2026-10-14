# PROWASH — Premium Vehicle Cleaning & Care

> **Clean cars. Happy rides.**

PROWASH is a full-stack mobile application for booking vehicle washing and cleaning services. Customers can register, add vehicles, browse services, book time slots, and track their appointments. The business owner manages everything from a secure admin dashboard.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or later |
| npm | 9 or later |
| MongoDB | 6 or later (local) or MongoDB Atlas |
| Expo CLI | `npm install -g expo-cli` |
| Android Studio / Xcode | For running on emulator / device |

---

## Server Setup

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `server/.env` and set at minimum:

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/prowash` |
| `JWT_SECRET` | Secret for signing JWTs (keep private!) | `a_long_random_string` |
| `JWT_EXPIRE` | Token expiry duration | `7d` |
| `ADMIN_EMAIL` | First admin account email | `admin@prowash.com` |
| `ADMIN_PASSWORD` | First admin account password | `Admin@1234` |
| `ADMIN_NAME` | Display name for admin | `ProWash Admin` |
| `EMAIL_HOST` | SMTP host (optional in dev) | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP username | |
| `EMAIL_PASS` | SMTP password | |

> **Note:** In development (`NODE_ENV=development`), emails are logged to the console if SMTP credentials are not set — the server will not crash.

### 3. Seed the first admin account

```bash
cd server
npm run seed
# or: node scripts/seedAdmin.js
```

Expected output: `Admin seeded successfully: admin@prowash.com`

### 4. Start the server

```bash
cd server
npm start         # production
npm run dev       # development with auto-reload (nodemon)
```

Expected output:
```
MongoDB connected: localhost
Server running on port 5000 (development)
```

### 5. Verify health endpoint

```bash
curl http://localhost:5000/api/health
# {"status":"ok","timestamp":"..."}
```

---

## Mobile Setup

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set `API_BASE_URL` to your server address (e.g. `http://192.168.1.x:5000` for a local network device, or your deployed server URL).

### 3. Start the Expo development server

```bash
cd mobile
npx expo start
```

Scan the QR code with **Expo Go** on your device, or press `a` for Android emulator / `i` for iOS simulator.

### 4. Export / build

```bash
# Android bundle check
npx expo export --platform android
```

---

## API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Server health check |
| POST | `/api/auth/register` | None | Register a new customer |
| POST | `/api/auth/login` | None | Login and receive JWT |
| GET | `/api/auth/me` | Bearer token | Get current user |
| POST | `/api/auth/forgot-password` | None | Request password reset email |
| POST | `/api/auth/reset-password/:token` | None | Reset password with token |

> **Security note:** `POST /api/auth/register` will reject any request that includes `role: "admin"` in the body (returns 403). Admin accounts are created only via the seed script.

---

## PROWASH Color Palette

| Name | Hex | Usage |
|---|---|---|
| Midnight Navy | `#0B1B2B` | Primary dark background |
| Ocean Blue | `#147DAB` | Primary accent / buttons |
| Aqua | `#40C4FF` | Highlights / active states |
| Cloud White | `#F4F7FA` | Light background / cards |
| Soft Gray | `#E8EEF3` | Borders / dividers |
| Success | `#22C55E` | Success states |
| Warning | `#F59E0B` | Warning states |
| Error | `#EF4444` | Error states / validation |

---

## Project Structure

```
PROWASH/
  mobile/             # React Native / Expo mobile app
    src/
      assets/
      components/     # Reusable UI components
      navigation/     # React Navigation stacks and tabs
      screens/        # All application screens
        auth/
        customer/
        admin/
      context/        # AuthContext and global state
      services/       # API client and service modules
      theme/          # colors, spacing, typography
  server/             # Node.js / Express / MongoDB API
    scripts/          # Utility scripts (seedAdmin)
    src/
      config/         # Database connection
      controllers/    # Route handler logic
      middleware/     # auth, errorHandler, validate
      models/         # Mongoose schemas
      routes/         # Express routers
      services/       # Business logic services
      utils/          # Helpers (generateToken, sendEmail)
  README.md
```

---

## Roles

| Role | Access |
|---|---|
| `customer` | Own profile, own vehicles, own bookings, payments |
| `admin` | Full management: services, bookings, customers, payments, reports |

Customers can never access admin endpoints. Role cannot be elevated via the public API.

---

## License

Private — PROWASH proprietary. All rights reserved.
