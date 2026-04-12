const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/auth');
const { sosLimiter } = require('../middleware/rateLimiter');
const {
  triggerSOS,
  updateSOSLocation,
  resolveSOSAlert,
  getActiveSOSAlerts,
  cancelSOS,
} = require('../controllers/sosController');

router.post('/', authenticateUser, sosLimiter, triggerSOS);
router.put('/:alertId/location', authenticateUser, updateSOSLocation);
router.put('/:alertId/resolve', authenticateUser, requireRole('security', 'admin'), resolveSOSAlert);
router.put('/:alertId/cancel', authenticateUser, cancelSOS);
router.get('/', authenticateUser, requireRole('security', 'admin'), getActiveSOSAlerts);

module.exports = router;
