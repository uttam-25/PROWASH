import { validationResult, body } from 'express-validator';

/**
 * Runs accumulated express-validator checks and returns a 400 response
 * if any validation errors exist, otherwise calls next().
 */
export const validate = (schema) => {
  return [
    ...schema,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const formatted = errors.array().map((e) => ({
          field: e.path || e.param,
          message: e.msg,
        }));
        return res.status(400).json({ success: false, errors: formatted });
      }
      next();
    },
  ];
};

// ---------------------------------------------------------------------------
// Validation rule arrays
// ---------------------------------------------------------------------------

export const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('phone')
    .optional()
    .trim(),
];

export const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

export const forgotPasswordRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

export const resetPasswordRules = [
  body('password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const vehicleRules = [
  body('type')
    .notEmpty().withMessage('Vehicle type is required')
    .isIn(['Car', 'Bike', 'Scooty', 'SUV', 'Truck', 'Van'])
    .withMessage('Vehicle type must be one of: Car, Bike, Scooty, SUV, Truck, Van'),
  body('make')
    .trim()
    .notEmpty().withMessage('Vehicle make is required'),
  body('model')
    .trim()
    .notEmpty().withMessage('Vehicle model is required'),
];

export const serviceRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Service name is required'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['exterior', 'interior', 'full', 'premium'])
    .withMessage('Category must be one of: exterior, interior, full, premium'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isNumeric().withMessage('Price must be a number')
    .custom((val) => val >= 0).withMessage('Price cannot be negative'),
  body('duration')
    .notEmpty().withMessage('Duration is required')
    .isNumeric().withMessage('Duration must be a number')
    .custom((val) => val >= 1).withMessage('Duration must be at least 1 minute'),
];

export const bookingRules = [
  body('vehicleId')
    .notEmpty().withMessage('Vehicle ID is required'),
  body('serviceId')
    .notEmpty().withMessage('Service ID is required'),
  body('startAt')
    .notEmpty().withMessage('startAt is required')
    .isISO8601().withMessage('startAt must be a valid ISO 8601 date string'),
  body('paymentMethod')
    .notEmpty().withMessage('paymentMethod is required')
    .isIn(['cod', 'online']).withMessage("paymentMethod must be 'cod' or 'online'"),
];

export const rescheduleRules = [
  body('newStartAt')
    .notEmpty().withMessage('newStartAt is required')
    .isISO8601().withMessage('newStartAt must be a valid ISO 8601 date string'),
];

export const updateProfileRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('phone')
    .optional()
    .trim(),
];

export const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];
