import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken, generateResetToken } from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import { AppError } from '../middleware/errorHandler.js';

// Helper — shape the user object returned to the client (no password)
const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  avatar: user.avatar,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Security: never allow a public registration to create an admin account
    if (role && role === 'admin') {
      return next(new AppError('You cannot register as an admin', 403));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email already exists', 400));
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'customer', // always force customer role on registration
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: userResponse(user),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password since it has select:false on the schema
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 401));
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: userResponse(user),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me  (protected)
// ---------------------------------------------------------------------------
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: userResponse(req.user),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Return 200 to avoid leaking registered emails
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    const { token: rawToken, hash, expires } = generateResetToken();

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(expires);
    await user.save({ validateBeforeSave: false });

    const resetLink = `PROWASH://reset-password/${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: 'PROWASH — Password Reset Request',
      text: `You requested a password reset.\n\nUse this link to reset your password (valid for 1 hour):\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
      html: `
        <p>You requested a password reset for your <strong>PROWASH</strong> account.</p>
        <p>Tap the link below (valid for 1 hour):</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password/:token
// ---------------------------------------------------------------------------
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the raw token from the URL and look it up
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Reset token is invalid or has expired', 400));
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const newToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      token: newToken,
      user: userResponse(user),
    });
  } catch (err) {
    next(err);
  }
};
