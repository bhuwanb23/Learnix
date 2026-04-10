const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All exam routes require authentication
router.use(authenticateToken);

// Exam creation and management (teachers only)
router.post('/', authorizeRole('teacher'), examController.createExam);
router.get('/class/:classId', authorizeRole('teacher', 'student'), examController.getExamsByClass);
router.get('/:id', authorizeRole('teacher', 'student'), examController.getExamById);
router.put('/:id', authorizeRole('teacher'), examController.updateExam);
router.delete('/:id', authorizeRole('teacher'), examController.deleteExam);
router.post('/:id/publish', authorizeRole('teacher'), examController.publishExam);

// Exam calendar (teachers and students)
router.get('/class/:classId/calendar', authorizeRole('teacher', 'student'), examController.getExamCalendar);

// Exam results management (teachers only)
router.post('/:examId/results', authorizeRole('teacher'), examController.createExamResult);
router.get('/:examId/results', authorizeRole('teacher', 'student'), examController.getExamResultsByExam);
router.put('/results/:resultId', authorizeRole('teacher'), examController.updateExamResult);
router.post('/:examId/results/publish', authorizeRole('teacher'), examController.publishExamResults);

// Exam analytics (teachers only)
router.get('/:examId/statistics', authorizeRole('teacher'), examController.getExamStatistics);

// Result audit trail (teachers only)
router.get('/results/:resultId/audit', authorizeRole('teacher'), examController.getResultAuditTrail);

module.exports = router;