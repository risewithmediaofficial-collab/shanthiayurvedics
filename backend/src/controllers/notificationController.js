import { Notification } from '../models/Notification.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;

  const query = {
    $or: [{ userId: req.user.id }, { branchId: req.user.branchId }]
  };

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ ...query, isRead: false })
  ]);

  return ApiResponse.success(res, notifications, 'Notifications fetched', 200, { unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
  return ApiResponse.success(res, null, 'Notification marked as read');
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { $or: [{ userId: req.user.id }, { branchId: req.user.branchId }], isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return ApiResponse.success(res, null, 'All notifications marked as read');
});
