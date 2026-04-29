const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');
const {
  submitReport,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  deleteIncident,
  getHeatmapData,
  getIncidentStats,
} = require('../controllers/incidentController');

router.post('/', authenticateUser, reportLimiter, submitReport);
router.get('/', authenticateUser, getIncidents);
router.get('/heatmap', authenticateUser, getHeatmapData);
router.get('/stats', authenticateUser, requireRole('security', 'admin'), getIncidentStats);
router.get('/:id', authenticateUser, getIncidentById);
router.put('/:id/status', authenticateUser, requireRole('security', 'admin'), updateIncidentStatus);
router.delete('/:id', authenticateUser, requireRole('security', 'admin'), deleteIncident);

module.exports = router;
