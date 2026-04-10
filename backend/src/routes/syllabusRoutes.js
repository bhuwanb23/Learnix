const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabusController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All syllabus routes require authentication
router.use(authenticateToken);

// Teacher and admin can manage syllabus progress
router.route('/progress/:subjectId/:classId')
  .get(authorizeRole('admin', 'teacher', 'student'), syllabusController.getSyllabusProgress)
  .put(authorizeRole('admin', 'teacher'), syllabusController.updateSyllabusProgress);

// Class analytics - teachers and admins can view
router.get('/analytics/:classId', authorizeRole('admin', 'teacher'), syllabusController.getClassAnalytics);

// Comparison data - teachers and admins can view
router.get('/comparison', authorizeRole('admin', 'teacher'), syllabusController.getComparisonData);

// Progress reports - teachers and admins can generate
router.get('/reports/:classId', authorizeRole('admin', 'teacher'), syllabusController.generateProgressReport);

// Progress notifications - teachers and admins can view and create
router.route('/notifications')
  .get(authorizeRole('admin', 'teacher'), syllabusController.getProgressNotifications)
  .post(authorizeRole('admin', 'teacher'), syllabusController.createProgressNotification);

module.exports = router;