import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from './errorHandler.js';

/**
 * Protect routes — require a valid Bearer JWT.
 * Attaches the authenticated user to req.user.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Not authorised — no token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }
    if (!user.isActive) {
      return next(new AppError('Account has been deactivated', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(err);
  }
};

/**
 * Restrict access to admin users only.
 * Must be used after protect().
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Access denied — admin only', 403));
  }
  next();
};

/**
 * Restrict access to partner users only.
 * Must be used after protect().
 */
export const requirePartner = (req, res, next) => {
  if (!req.user || req.user.role !== 'partner') {
    return next(new AppError('Access denied — partners only', 403));
  }
  next();
};
