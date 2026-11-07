const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { readLimiter, writeLimiter } = require('../middleware/rateLimiter');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');

router.get('/', authenticateUser, readLimiter, getUserNotifications);
router.put('/read-all', authenticateUser, writeLimiter, markAllAsRead);
router.put('/:id/read', authenticateUser, writeLimiter, markAsRead);

module.exports = router;
