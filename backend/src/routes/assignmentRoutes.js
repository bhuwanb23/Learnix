const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All assignment routes require authentication
router.use(authenticateToken);

// Assignment creation and management (teachers only)
router.post('/', authorizeRole('teacher'), assignmentController.createAssignment);
router.get('/course/:courseId', authorizeRole('teacher', 'student'), assignmentController.getAssignmentsByCourse);
router.get('/:id', authorizeRole('teacher', 'student'), assignmentController.getAssignmentById);
router.put('/:id', authorizeRole('teacher'), assignmentController.updateAssignment);
router.delete('/:id', authorizeRole('teacher'), assignmentController.deleteAssignment);

// Assignment submission (students only)
router.post('/:assignmentId/submit', authorizeRole('student'), assignmentController.submitAssignment);

// Submission management (teachers only)
router.get('/submissions/:id', authorizeRole('teacher'), assignmentController.getSubmissionById);
router.get('/:assignmentId/submissions', authorizeRole('teacher'), assignmentController.getSubmissionsByAssignment);
router.post('/submissions/:submissionId/grade', authorizeRole('teacher'), assignmentController.gradeSubmission);

// Plagiarism check (teachers only)
router.post('/submissions/:submissionId/plagiarism', authorizeRole('teacher'), assignmentController.checkPlagiarism);

// Analytics (teachers only)
router.get('/:assignmentId/analytics', authorizeRole('teacher'), assignmentController.getAssignmentAnalytics);

// Automated grading (teachers only)
router.post('/submissions/:submissionId/auto-grade', authorizeRole('teacher'), assignmentController.autoGradeObjective);

module.exports = router;