/**
 * PROWASH — client-side validation helpers.
 * All functions are pure (no side-effects, no imports).
 */

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  // Accepts 10-digit Indian numbers, optionally prefixed with +91 or 0
  return /^(\+91|0)?[6-9]\d{9}$/.test(phone.trim());
}

/**
 * Minimum 8 characters, at least one uppercase letter and one digit.
 */
export function isStrongPassword(pw) {
  if (typeof pw !== 'string') return false;
  return pw.length >= 8 && /[A-Z]/.test(pw) && /\d/.test(pw);
}

export function isRequired(val) {
  if (val === null || val === undefined) return false;
  return String(val).trim().length > 0;
}

/**
 * Validate the customer registration form.
 * @param {{ name, email, phone, password, confirmPassword }} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateRegisterForm(data) {
  const errors = {};
  const { name, email, phone, password, confirmPassword } = data || {};

  if (!isRequired(name)) {
    errors.name = 'Full name is required.';
  } else if (String(name).trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!isRequired(email)) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!isRequired(phone)) {
    errors.phone = 'Phone number is required.';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number.';
  }

  if (!isRequired(password)) {
    errors.password = 'Password is required.';
  } else if (!isStrongPassword(password)) {
    errors.password =
      'Password must be at least 8 characters with one uppercase letter and one number.';
  }

  if (!isRequired(confirmPassword)) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
