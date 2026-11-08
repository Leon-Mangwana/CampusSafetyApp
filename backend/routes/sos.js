const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/auth');
const { sosLimiter, readLimiter, writeLimiter } = require('../middleware/rateLimiter');
const {
  triggerSOS,
  updateSOSLocation,
  resolveSOSAlert,
  getActiveSOSAlerts,
  cancelSOS,
} = require('../controllers/sosController');

const staff = requireRole('security', 'admin');

router.post('/', authenticateUser, sosLimiter, triggerSOS);
router.put('/:alertId/location', authenticateUser, writeLimiter, updateSOSLocation);
router.put('/:alertId/resolve', authenticateUser, staff, writeLimiter, resolveSOSAlert);
router.put('/:alertId/cancel', authenticateUser, writeLimiter, cancelSOS);
router.get('/', authenticateUser, staff, readLimiter, getActiveSOSAlerts);

module.exports = router;
