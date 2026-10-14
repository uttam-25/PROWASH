/**
 * Notification service — stub for Phase 1.
 * Will be wired to Expo Push Notifications in a later phase.
 */

/**
 * Send a push notification to a specific user.
 * @param {string} userId  - MongoDB User _id
 * @param {string} title   - Notification title
 * @param {string} body    - Notification body text
 * @returns {Promise<void>}
 */
export const sendPushNotification = async (userId, title, body) => {
  console.log(`[Notification] userId=${userId} | title="${title}" | body="${body}"`);
  return Promise.resolve();
};
