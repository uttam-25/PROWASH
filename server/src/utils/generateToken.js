import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Generate a signed JWT for the given user ID.
 * @param {string} userId
 * @returns {string} signed JWT token
 */
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Generate a password-reset token.
 * Returns the raw token (sent to user), its SHA-256 hash (stored in DB),
 * and the expiry timestamp (1 hour from now).
 * @returns {{ token: string, hash: string, expires: number }}
 */
export const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = Date.now() + 3600000; // 1 hour
  return { token, hash, expires };
};
