import Notification from '../models/Notification.js';

/**
 * Create a Notification document directly in the database.
 *
 * @param {string} userId  - MongoDB User _id
 * @param {string} title   - Notification title
 * @param {string} body    - Notification body text
 * @param {string} [type='general'] - Notification type category
 * @param {object} [data]  - Optional extra payload
 * @returns {Promise<Notification>}
 */
export const createNotification = async (userId, title, body, type = 'general', data = null) => {
  const notification = await Notification.create({
    user: userId,
    title,
    body,
    type,
    ...(data ? { data } : {}),
  });
  return notification;
};

/**
 * Send a push notification to a specific user.
 * Persists a Notification document to MongoDB and logs to console.
 * Will be wired to Expo Push Notifications in a later phase.
 *
 * @param {string} userId  - MongoDB User _id
 * @param {string} title   - Notification title
 * @param {string} body    - Notification body text
 * @param {string} [type='general'] - Notification type category
 * @returns {Promise<void>}
 */
export const sendPushNotification = async (userId, title, body, type = 'general') => {
  console.log(`[Notification] userId=${userId} | title="${title}" | body="${body}"`);
  try {
    await createNotification(userId, title, body, type);
  } catch (err) {
    // Non-fatal — log but do not crash the caller
    console.error('[Notification] Failed to persist notification:', err.message);
  }
};

// ---------------------------------------------------------------------------
// Semantic helper functions — each wraps createNotification with a specific
// title/body/type. Callers fire-and-forget with .catch(console.error).
// userId is always taken from booking.customerId so helpers work even when
// the customer object is not fully populated.
// ---------------------------------------------------------------------------

export async function notifyBookingCreated(booking, customer) {
  await createNotification(
    booking.customerId,
    'Booking Received',
    `Your ${booking.serviceNameSnapshot} is pending confirmation.`,
    'booking',
    { bookingId: booking._id }
  );
}

export async function notifyBookingConfirmed(booking, customer) {
  await createNotification(
    booking.customerId,
    'Booking Confirmed',
    `Your booking ${booking.bookingReference} has been confirmed.`,
    'booking',
    { bookingId: booking._id }
  );
}

export async function notifyBookingCancelled(booking, customer) {
  await createNotification(
    booking.customerId,
    'Booking Cancelled',
    `Your booking ${booking.bookingReference} has been cancelled.`,
    'booking',
    { bookingId: booking._id }
  );
}

export async function notifyPaymentConfirmed(booking, customer) {
  await createNotification(
    booking.customerId,
    'Payment Confirmed',
    `Payment for booking ${booking.bookingReference} has been received.`,
    'payment',
    { bookingId: booking._id }
  );
}

export async function notifyWashStarted(booking, customer) {
  await createNotification(
    booking.customerId,
    'Wash Started',
    `Your wash for ${booking.serviceNameSnapshot} has started!`,
    'booking',
    { bookingId: booking._id }
  );
}

export async function notifyWashCompleted(booking, customer) {
  await createNotification(
    booking.customerId,
    'Wash Completed',
    `Your ${booking.serviceNameSnapshot} is complete. Thank you!`,
    'booking',
    { bookingId: booking._id }
  );
}
