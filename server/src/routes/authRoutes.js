import { Router } from 'express';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} from '../middleware/validate.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(registerRules), register);

// POST /api/auth/login
router.post('/login', validate(loginRules), login);

// GET /api/auth/me  (protected)
router.get('/me', protect, getMe);

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordRules), forgotPassword);

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', validate(resetPasswordRules), resetPassword);

export default router;
