import Notification from '../models/Notification.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// GET /api/notifications  (protect, sorted newest first)
// ---------------------------------------------------------------------------
export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/notifications/:id/read  (protect, ownership check)
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
// PUT /api/notifications/read-all  (protect)
// ---------------------------------------------------------------------------
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (err) {
    next(err);
  }
};
