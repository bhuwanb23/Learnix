const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateRequest, timetableValidationSchema, checkTimetableConflicts, validateTimetableRules } = require('../middleware/validation');

// All timetable routes require authentication
router.use(authenticateToken);

// Admin and teacher can manage timetables
router.route('/')
  .get(authorizeRole('admin', 'teacher', 'student'), timetableController.getAllTimetables)
  .post(
    authorizeRole('admin', 'teacher'), 
    validateRequest(timetableValidationSchema),
    validateTimetableRules,
    checkTimetableConflicts,
    timetableController.createTimetable
  );

router.route('/:id')
  .get(authorizeRole('admin', 'teacher', 'student'), timetableController.getTimetableById)
  .put(
    authorizeRole('admin', 'teacher'), 
    validateRequest(timetableValidationSchema),
    validateTimetableRules,
    checkTimetableConflicts,
    timetableController.updateTimetable
  )
  .delete(authorizeRole('admin', 'teacher'), timetableController.deleteTimetable);

// Get timetable for a specific class
router.get('/class/:classId', authorizeRole('admin', 'teacher', 'student'), timetableController.getClassTimetable);

// Export timetable
router.get('/class/:classId/export/pdf', authorizeRole('admin', 'teacher', 'student'), timetableController.exportTimetablePDF);
router.get('/class/:classId/export/csv', authorizeRole('admin', 'teacher', 'student'), timetableController.exportTimetableCSV);

// Get timetable history
router.get('/:timetableId/history', authorizeRole('admin', 'teacher', 'student'), timetableController.getTimetableHistory);

// Rollback timetable to a previous version
router.post('/:timetableId/rollback/:historyId', authorizeRole('admin', 'teacher'), timetableController.rollbackTimetable);

module.exports = router;