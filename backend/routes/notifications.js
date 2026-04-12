const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');

router.get('/', authenticateUser, getUserNotifications);
router.put('/:id/read', authenticateUser, markAsRead);
router.put('/read-all', authenticateUser, markAllAsRead);

module.exports = router;
