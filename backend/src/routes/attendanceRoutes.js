const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateRequest, attendanceValidationSchema } = require('../middleware/validation');

// All attendance routes require authentication
router.use(authenticateToken);

// Admin and teacher can manage attendance
router.route('/')
  .get(authorizeRole('admin', 'teacher', 'student'), attendanceController.getAllAttendance)
  .post(
    authorizeRole('admin', 'teacher'), 
    validateRequest(attendanceValidationSchema),
    attendanceController.createAttendance
  );

// Get attendance statistics
router.get('/stats', authorizeRole('admin', 'teacher', 'student'), attendanceController.getAttendanceStats);

// Bulk attendance entry
router.post('/bulk', authorizeRole('admin', 'teacher'), attendanceController.createBulkAttendance);

// Bulk attendance status update
router.put('/bulk', authorizeRole('admin', 'teacher'), attendanceController.updateBulkAttendanceStatus);

// Get student attendance summary
router.get('/student/:studentId/summary', authorizeRole('admin', 'teacher', 'student'), attendanceController.getStudentAttendanceSummary);

// Get class attendance report
router.get('/class/:classId/report', authorizeRole('admin', 'teacher'), attendanceController.getClassAttendanceReport);

router.route('/:id')
  .get(authorizeRole('admin', 'teacher', 'student'), attendanceController.getAttendanceById)
  .put(
    authorizeRole('admin', 'teacher'), 
    validateRequest(attendanceValidationSchema),
    attendanceController.updateAttendance
  )
  .delete(authorizeRole('admin', 'teacher'), attendanceController.deleteAttendance);

module.exports = router;