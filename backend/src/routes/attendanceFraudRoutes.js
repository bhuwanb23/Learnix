const express = require('express');
const router = express.Router();
const attendanceFraudController = require('../controllers/attendanceFraudController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All attendance fraud routes require authentication
router.use(authenticateToken);

// Get fraud alerts for a specific class session
router.get('/alerts', authorizeRole('admin', 'teacher'), attendanceFraudController.getFraudAlerts);

// Get fraud risk score for a specific student
router.get('/risk/:studentId', authorizeRole('admin', 'teacher'), attendanceFraudController.getStudentFraudRisk);

// Get all students with high fraud risk
router.get('/high-risk', authorizeRole('admin', 'teacher'), attendanceFraudController.getHighRiskStudents);

// Detect duplicate attendance records
router.get('/duplicates', authorizeRole('admin', 'teacher'), attendanceFraudController.getDuplicateAttendance);

module.exports = router;