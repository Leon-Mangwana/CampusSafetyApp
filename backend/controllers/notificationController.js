const { db } = require('../config/firebase');
const log = require('../utils/logger');

const MAX_NOTIFICATIONS = 100;

/**
 * Get user notifications
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db
      .ref('notifications')
      .orderByChild('recipientId')
      .equalTo(userId)
      .once('value');

    let notifications = [];
    snapshot.forEach((child) => notifications.push(child.val()));
    notifications.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    notifications = notifications.slice(0, MAX_NOTIFICATIONS);

    res.json({ notifications, total: notifications.length });
  } catch (error) {
    log.error('notifications.list_failed', { err: error });
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

/**
 * Mark one of the caller's own notifications as read.
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.ref(`notifications/${id}`);
    const snapshot = await ref.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    if (snapshot.val().recipientId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this notification.' });
    }
    await ref.update({ isRead: true });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    log.error('notifications.mark_read_failed', { err: error });
    res.status(500).json({ error: 'Failed to update notification.' });
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db
      .ref('notifications')
      .orderByChild('recipientId')
      .equalTo(userId)
      .once('value');

    const updates = {};
    snapshot.forEach((child) => {
      updates[`notifications/${child.key}/isRead`] = true;
    });

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    log.error('notifications.mark_all_read_failed', { err: error });
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
};

module.exports = { getUserNotifications, markAsRead, markAllAsRead };
