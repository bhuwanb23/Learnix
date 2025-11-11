const express = require('express');
const router = express.Router();
const attendanceAnalyticsController = require('../controllers/attendanceAnalyticsController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All attendance analytics routes require authentication
router.use(authenticateToken);

// Get detailed attendance analytics
router.get('/', authorizeRole('admin', 'teacher'), attendanceAnalyticsController.getAttendanceAnalytics);

// Get comprehensive attendance summary
router.get('/summary', authorizeRole('admin', 'teacher'), attendanceAnalyticsController.getAttendanceSummary);

// Get attendance comparison between subjects
router.get('/comparison', authorizeRole('admin', 'teacher'), attendanceAnalyticsController.getAttendanceComparison);

// Get low attendance alerts
router.get('/alerts', authorizeRole('admin', 'teacher'), attendanceAnalyticsController.getLowAttendanceAlerts);

// Export attendance data
router.get('/export', authorizeRole('admin', 'teacher'), attendanceAnalyticsController.exportAttendanceData);

module.exports = router;