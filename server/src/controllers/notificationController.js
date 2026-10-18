import Notification from '../models/Notification.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// GET /api/notifications  (protect, sorted newest first)
// Supports ?read=false to filter unread only
// ---------------------------------------------------------------------------
export const getMyNotifications = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.read === 'false') filter.isRead = false;

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/notifications/:id/read  (protect, ownership check)
// ---------------------------------------------------------------------------
export const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorised to update this notification', 403));
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/notifications/read-all  (protect)
// ---------------------------------------------------------------------------
export const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, data: { count: result.modifiedCount } });
  } catch (err) {
    next(err);
  }
};
