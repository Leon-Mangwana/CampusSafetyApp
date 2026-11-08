const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole, attachRole } = require('../middleware/auth');
const { reportLimiter, readLimiter, writeLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../middleware/asyncHandler');
const {
  submitReport,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  deleteIncident,
  getHeatmapData,
  getIncidentStats,
  getMonthlyReport,
} = require('../controllers/incidentController');

const staff = requireRole('security', 'admin');

router.post('/', authenticateUser, reportLimiter, asyncHandler(submitReport));
// Everyone may read aggregated views; detail depends on role (attachRole).
router.get('/heatmap', authenticateUser, attachRole, readLimiter, asyncHandler(getHeatmapData));
router.get('/stats', authenticateUser, attachRole, readLimiter, asyncHandler(getIncidentStats));
// Raw incident records (descriptions, exact coordinates) are staff only.
router.get('/', authenticateUser, staff, readLimiter, asyncHandler(getIncidents));
router.get('/report/monthly', authenticateUser, staff, readLimiter, asyncHandler(getMonthlyReport));
router.get('/:id', authenticateUser, staff, readLimiter, asyncHandler(getIncidentById));
router.put('/:id/status', authenticateUser, staff, writeLimiter, asyncHandler(updateIncidentStatus));
router.delete('/:id', authenticateUser, staff, writeLimiter, asyncHandler(deleteIncident));

module.exports = router;
