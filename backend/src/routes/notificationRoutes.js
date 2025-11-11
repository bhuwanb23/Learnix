const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All notification routes require authentication
router.use(authenticateToken);

// Send low attendance alert notification
router.post('/low-attendance-alert', authorizeRole('admin', 'teacher'), notificationController.sendLowAttendanceAlertNotification);

// Get notifications for current user
router.get('/', authorizeRole('admin', 'teacher', 'student'), notificationController.getUserNotifications);

// Mark notification as read
router.put('/:notificationId/read', authorizeRole('admin', 'teacher', 'student'), notificationController.markNotificationRead);

// Get unread notification count
router.get('/unread-count', authorizeRole('admin', 'teacher', 'student'), notificationController.getUnreadCount);

module.exports = router;