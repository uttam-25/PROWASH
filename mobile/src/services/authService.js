import api from './api';

/**
 * Register a new customer account.
 * @param {{ name, email, phone, password }} data
 */
export async function register(data) {
  const response = await api.post('/auth/register', data);
  return response.data;
}

/**
 * Log in with email and password.
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}

/**
 * Fetch the currently authenticated user.
 * Requires a valid Bearer token in the request header.
 */
export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data;
}

/**
 * Request a password-reset email.
 * @param {string} email
 */
export async function forgotPassword(email) {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
}

/**
 * Reset the password using the token from the reset link.
 * @param {string} token  - Raw token from deep-link params
 * @param {string} password  - New password
 */
export async function resetPassword(token, password) {
  const response = await api.post(`/auth/reset-password/${token}`, {
    password,
  });
  return response.data;
}

/**
 * Update the authenticated user's profile.
 * @param {{ name, phone }} data
 */
export async function updateProfile(data) {
  const response = await api.put('/auth/profile', data);
  return response.data;
}

/**
 * Change the authenticated user's password.
 * @param {{ currentPassword, newPassword }} data
 */
export async function changePassword(data) {
  const response = await api.put('/auth/change-password', data);
  return response.data;
}
