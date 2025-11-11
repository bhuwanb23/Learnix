const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateRequest, timetableValidationSchema } = require('../middleware/validation');

// All timetable routes require authentication
router.use(authenticateToken);

// Admin and teacher can manage timetables
router.route('/')
  .get(authorizeRole('admin', 'teacher', 'student'), timetableController.getAllTimetables)
  .post(
    authorizeRole('admin', 'teacher'), 
    validateRequest(timetableValidationSchema),
    timetableController.createTimetable
  );

router.route('/:id')
  .get(authorizeRole('admin', 'teacher', 'student'), timetableController.getTimetableById)
  .put(
    authorizeRole('admin', 'teacher'), 
    validateRequest(timetableValidationSchema),
    timetableController.updateTimetable
  )
  .delete(authorizeRole('admin', 'teacher'), timetableController.deleteTimetable);

// Get timetable for a specific class
router.get('/class/:classId', authorizeRole('admin', 'teacher', 'student'), timetableController.getClassTimetable);

module.exports = router;