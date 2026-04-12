const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  register,
  getProfile,
  updateProfile,
  updateFcmToken,
  updateLocation,
} = require('../controllers/authController');

router.post('/register', register);
router.get('/profile', authenticateUser, getProfile);
router.put('/profile', authenticateUser, updateProfile);
router.put('/fcm-token', authenticateUser, updateFcmToken);
router.put('/location', authenticateUser, updateLocation);

module.exports = router;
