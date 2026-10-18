import Constants from 'expo-constants';

export const APP_NAME = 'PROWASH';
export const TAGLINE = 'Premium Vehicle Cleaning & Care';

export const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
};

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  RESCHEDULED: 'rescheduled',
};

export const PAYMENT_METHODS = {
  COD: 'cod',
  RAZORPAY: 'razorpay',
};

export const VEHICLE_TYPES = ['Car', 'Bike', 'Scooty', 'SUV', 'Truck', 'Van'];

// Resolve the API base URL from Expo config extra, then env fallback
const expoExtra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
export const API_BASE_URL =
  expoExtra.apiUrl || 'http://localhost:5000/api';
