const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/auth');
const { registerLimiter, readLimiter, writeLimiter } = require('../middleware/rateLimiter');
const {
  register,
  getProfile,
  updateProfile,
  updatePushToken,
  updateLocation,
  clearLocation,
  updateUserRole,
} = require('../controllers/authController');

router.post('/register', registerLimiter, register);
router.get('/profile', authenticateUser, readLimiter, getProfile);
router.put('/profile', authenticateUser, writeLimiter, updateProfile);
router.put('/push-token', authenticateUser, writeLimiter, updatePushToken);
router.put('/fcm-token', authenticateUser, writeLimiter, updatePushToken); // legacy alias
router.put('/location', authenticateUser, writeLimiter, updateLocation);
router.delete('/location', authenticateUser, writeLimiter, clearLocation);
router.put('/users/:uid/role', authenticateUser, requireRole('admin'), writeLimiter, updateUserRole);

module.exports = router;
