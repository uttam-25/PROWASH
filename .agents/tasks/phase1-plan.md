# PROWASH Phase 1 — Implementation Plan

This plan is decomposed into two sequential, independently-verifiable features.
FEAT-001 (backend) must be completed before FEAT-002 (mobile) because the mobile app
connects to the backend API.

Full FEAT specifications live at:
- `c:\Users\Dell\Desktop\PROWASH\.agents\tasks\phase1-prowash\features\FEAT-001.json`
- `c:\Users\Dell\Desktop\PROWASH\.agents\tasks\phase1-prowash\features\FEAT-002.json`
- `c:\Users\Dell\Desktop\PROWASH\.agents\tasks\phase1-prowash\context.json`

---

## FEAT-001: Backend Scaffold & Auth API

> Node.js / Express / MongoDB server with JWT authentication, role-based middleware,
> and an admin seed script.

- [ ] 1. **server/package.json** — ES-module Node project, dependencies: express, mongoose,
      bcryptjs, jsonwebtoken, dotenv, cors, express-validator, nodemailer, morgan, helmet.
      devDependencies: nodemon. Scripts: start, dev, seed.
      Files: `server/package.json`
      Verify: `cd server && npm install` exits 0.

- [ ] 2. **Environment files** — `.env.example` and `.env` with PORT, MONGO_URI, JWT_SECRET,
      JWT_EXPIRE, EMAIL_*, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME.
      Files: `server/.env.example`, `server/.env`
      Verify: both files exist and are readable.

- [ ] 3. **server/src/config/db.js** — async connectDB() using mongoose.connect().
      Files: `server/src/config/db.js`
      Verify: imported by server.js without syntax error.

- [ ] 4. **server/src/models/User.js** — Mongoose schema: name, email (unique), password
      (select:false), role (customer|admin, default customer), phone, avatar,
      resetPasswordToken, resetPasswordExpires, isActive, timestamps. Pre-save bcryptjs
      hash. comparePassword() instance method.
      Files: `server/src/models/User.js`
      Verify: node -e "import('./src/models/User.js').then(()=>console.log('ok'))" from server/ exits 0.

- [ ] 5. **server/src/utils/generateToken.js** — generateToken(userId) signs JWT.
      generateResetToken() returns { token, hash, expires } using Node crypto.
      Files: `server/src/utils/generateToken.js`
      Verify: importable without error.

- [ ] 6. **server/src/utils/sendEmail.js** — nodemailer transport; in dev mode logs to console
      when credentials are absent, never throws.
      Files: `server/src/utils/sendEmail.js`
      Verify: importable without error.

- [ ] 7. **server/src/middleware/errorHandler.js** — 4-arg Express error handler + AppError class.
      Files: `server/src/middleware/errorHandler.js`
      Verify: importable without error.

- [ ] 8. **server/src/middleware/auth.js** — protect() (JWT verify, attach req.user) +
      requireAdmin() (role check).
      Files: `server/src/middleware/auth.js`
      Verify: importable without error.

- [ ] 9. **server/src/middleware/validate.js** — validate(schema) middleware using
      express-validator. Named rule arrays: registerRules, loginRules,
      forgotPasswordRules, resetPasswordRules.
      Files: `server/src/middleware/validate.js`
      Verify: importable without error.

- [ ] 10. **server/src/controllers/authController.js** — register (blocks admin role),
       login, getMe, forgotPassword, resetPassword.
       Files: `server/src/controllers/authController.js`
       Verify: importable without error.

- [ ] 11. **server/src/routes/authRoutes.js** — POST /register, POST /login,
       GET /me (protected), POST /forgot-password, POST /reset-password/:token.
       Files: `server/src/routes/authRoutes.js`
       Verify: importable without error.

- [ ] 12. **server/src/services/notificationService.js** — stub sendPushNotification() that logs.
       Files: `server/src/services/notificationService.js`
       Verify: importable without error.

- [ ] 13. **server/src/app.js** — Express app with helmet, cors, morgan, json middleware,
       GET /api/health, auth routes at /api/auth, errorHandler last.
       Files: `server/src/app.js`
       Verify: importable without error.

- [ ] 14. **server/src/server.js** — bootstraps connectDB + app.listen.
       Files: `server/src/server.js`
       Verify: `node src/server.js` starts (with valid MONGO_URI) and prints
       "Server running on port 5000".

- [ ] 15. **server/scripts/seedAdmin.js** — standalone script; creates admin account from env vars
       if none exists.
       Files: `server/scripts/seedAdmin.js`
       Verify: `node scripts/seedAdmin.js` prints "Admin seeded" or "Admin already exists".

- [ ] 16. **Smoke test** — with server running, `curl http://localhost:5000/api/health`
       returns `{"status":"ok"}`. POST /api/auth/register with valid body returns 201.
       GET /api/auth/me without token returns 401.

---

## FEAT-002: Mobile Scaffold, Theme, Components & Auth Screens

> Expo / React Native app with navigation shell, AuthContext, API service, all
> auth screens, stub home screens. Depends on FEAT-001 (API_URL must point at it).

- [ ] 1. **mobile/package.json** — Expo SDK ~51 project. Dependencies: expo, react, react-native,
      @react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs,
      expo-status-bar, expo-secure-store, expo-constants, expo-image-picker, expo-font,
      @expo/vector-icons, axios, @react-native-async-storage/async-storage,
      react-native-safe-area-context, react-native-screens, react-native-gesture-handler,
      react-native-reanimated, react-hook-form. devDependencies: babel-preset-expo.
      Files: `mobile/package.json`
      Verify: `cd mobile && npm install` exits 0.

- [ ] 2. **mobile/app.json, babel.config.js, .env.example, .env** — Expo config (name PROWASH,
      slug prowash, splash background #0B1B2B, scheme prowash). babel-preset-expo. env with API_URL.
      Files: `mobile/app.json`, `mobile/babel.config.js`, `mobile/.env.example`, `mobile/.env`
      Verify: files exist.

- [ ] 3. **mobile/src/assets/ stub** — placeholder README noting icon.png and splash.png are needed.
      Files: `mobile/src/assets/README.md`
      Verify: file exists.

- [ ] 4. **Theme files** — colors.js (PROWASH palette + dark mode variants), spacing.js
      (scale + borderRadius), typography.js (sizes, weights, makeTextStyle helper).
      Files: `mobile/src/theme/colors.js`, `mobile/src/theme/spacing.js`,
      `mobile/src/theme/typography.js`
      Verify: importable in expo export step.

- [ ] 5. **mobile/src/constants/index.js** — APP_NAME, TAGLINE, ROLES, BOOKING_STATUS,
      PAYMENT_METHODS, VEHICLE_TYPES, API_BASE_URL (from expo-constants or fallback).
      Files: `mobile/src/constants/index.js`
      Verify: importable.

- [ ] 6. **mobile/src/utils/storage.js** — SecureStore wrapper (saveToken, getToken, removeToken)
      + AsyncStorage wrapper (savePreference, getPreference, removePreference).
      Files: `mobile/src/utils/storage.js`
      Verify: importable.

- [ ] 7. **mobile/src/utils/validation.js** — isValidEmail, isValidPhone, isStrongPassword,
      isRequired, validateRegisterForm.
      Files: `mobile/src/utils/validation.js`
      Verify: importable.

- [ ] 8. **mobile/src/services/api.js** — axios instance with baseURL, request interceptor adds
      Bearer token, response interceptor triggers logout on 401.
      setLogoutCallback(fn) for AuthContext wiring.
      Files: `mobile/src/services/api.js`
      Verify: importable.

- [ ] 9. **mobile/src/services/authService.js** — register, login, getMe, forgotPassword,
      resetPassword functions wrapping api.js calls.
      Files: `mobile/src/services/authService.js`
      Verify: importable.

- [ ] 10. **mobile/src/context/AuthContext.js** — AuthProvider with user/token/loading state,
       token persistence via SecureStore, 401 callback wired to api, exposes login/logout/register.
       Exports useAuth hook.
       Files: `mobile/src/context/AuthContext.js`
       Verify: importable.

- [ ] 11. **mobile/src/hooks/useAuth.js** — re-exports useAuth from AuthContext.
       Files: `mobile/src/hooks/useAuth.js`
       Verify: importable.

- [ ] 12. **Shared components** — AppButton, AppInput, AppHeader, LoadingView, ErrorView,
       EmptyState, StatusBadge, ConfirmDialog. Each is a themed functional component.
       Files: `mobile/src/components/AppButton.js`, `AppInput.js`, `AppHeader.js`,
       `LoadingView.js`, `ErrorView.js`, `EmptyState.js`, `StatusBadge.js`, `ConfirmDialog.js`
       Verify: all importable; no undefined imports.

- [ ] 13. **Auth screens** — SplashScreen (branded, checks token, navigates), WelcomeScreen
       (branded CTAs), LoginScreen (email+password, role-based nav), RegisterScreen
       (full name, email, phone, password, confirm), ForgotPasswordScreen,
       ResetPasswordScreen (reads token from route params).
       Files: `mobile/src/screens/auth/SplashScreen.js`, `WelcomeScreen.js`,
       `LoginScreen.js`, `RegisterScreen.js`, `ForgotPasswordScreen.js`, `ResetPasswordScreen.js`
       Verify: all importable; bundle step succeeds.

- [ ] 14. **Stub home screens** — CustomerHomeScreen (shows user name, placeholder sections,
       logout), AdminHomeScreen (stat cards with '--', logout).
       Files: `mobile/src/screens/customer/CustomerHomeScreen.js`,
       `mobile/src/screens/admin/AdminHomeScreen.js`
       Verify: importable.

- [ ] 15. **Navigation** — AuthNavigator (native stack: Welcome, Login, Register,
       ForgotPassword, ResetPassword), CustomerNavigator (bottom tabs: Home stub),
       AdminNavigator (native stack: AdminHome stub), RootNavigator (reads auth state,
       shows LoadingView while loading, routes to correct navigator, NavigationContainer
       with deep-link scheme).
       Files: `mobile/src/navigation/AuthNavigator.js`, `CustomerNavigator.js`,
       `AdminNavigator.js`, `RootNavigator.js`
       Verify: importable; NavigationContainer renders.

- [ ] 16. **mobile/App.js** — GestureHandlerRootView > SafeAreaProvider > AuthProvider >
       RootNavigator.
       Files: `mobile/App.js`
       Verify: importable as root entry.

- [ ] 17. **Full bundle verification** — `cd mobile && npx expo export --platform android`.
       Fix any bundler errors, missing imports, or missing dependencies before marking done.
       Verify: exits 0, dist/ folder created.

---

## Deliverables

| File | Purpose |
|------|---------|
| `server/src/app.js` | Express app entry |
| `server/src/server.js` | Server bootstrap |
| `server/scripts/seedAdmin.js` | Admin seed script |
| `mobile/App.js` | Expo entry point |
| `mobile/src/navigation/RootNavigator.js` | Auth-aware root nav |
| `mobile/src/context/AuthContext.js` | Global auth state |
| `README.md` | Project setup instructions |

---

## README.md (root)

Create `README.md` at the workspace root documenting:
- Prerequisites (Node 18+, MongoDB, Expo CLI)
- How to set up server/.env and run the server
- How to run seedAdmin.js
- How to set up mobile/.env and start the Expo app
- Branding and color palette reference
