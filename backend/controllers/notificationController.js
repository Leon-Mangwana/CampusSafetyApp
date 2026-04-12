const { db } = require('../config/firebase');

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

    const notifications = [];
    snapshot.forEach((child) => notifications.push(child.val()));
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ notifications, total: notifications.length });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await db.ref(`notifications/${id}`).update({ isRead: true });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark as read error:', error);
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

    await db.ref().update(updates);
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
};

module.exports = { getUserNotifications, markAsRead, markAllAsRead };
