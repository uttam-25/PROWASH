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
