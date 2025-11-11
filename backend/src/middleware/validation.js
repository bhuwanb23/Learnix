const Joi = require('joi');
const Timetable = require('../models/Timetable');
const logger = require('../config/logger');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    req.validatedData = value;
    next();
  };
};

const timetableValidationSchema = Joi.object({
  courseId: Joi.string().required(),
  classId: Joi.string().required(),
  subjectId: Joi.string().required(),
  teacherId: Joi.string().required(),
  roomId: Joi.string().required(),
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:MM format
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:MM format
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(), // End date must be after start date
  isActive: Joi.boolean().default(true)
});

const attendanceValidationSchema = Joi.object({
  courseId: Joi.string().required(),
  classId: Joi.string().required(),
  subjectId: Joi.string().required(),
  teacherId: Joi.string().required(),
  studentId: Joi.string().required(),
  date: Joi.date().required(),
  status: Joi.string().valid('present', 'absent', 'late', 'excused').required(),
  method: Joi.string().valid('manual', 'qr', 'nfc', 'face_recognition').default('manual'),
  recordedBy: Joi.string().required(),
  notes: Joi.string().optional()
});

const documentValidationSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  courseId: Joi.string().optional(),
  classId: Joi.string().optional(),
  subjectId: Joi.string().optional(),
  fileType: Joi.string().required(),
  fileName: Joi.string().required(),
  filePath: Joi.string().required(),
  fileSize: Joi.number().optional(),
  isPublic: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string()).optional()
});

// Timetable conflict detection middleware
const checkTimetableConflicts = async (req, res, next) => {
  try {
    const { 
      courseId, 
      classId, 
      subjectId, 
      teacherId, 
      roomId, 
      dayOfWeek, 
      startTime, 
      endTime, 
      startDate, 
      endDate 
    } = req.body;
    
    // Convert time strings to minutes for easier comparison
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Check for conflicts with existing timetables
    const conflicts = await Timetable.findAll({
      where: {
        day_of_week: dayOfWeek,
        start_date: {
          [require('sequelize').Op.lte]: endDate
        },
        end_date: {
          [require('sequelize').Op.gte]: startDate
        }
      }
    });
    
    // Check for specific conflicts
    const hasConflict = conflicts.some(timetable => {
      // Convert existing timetable times
      const existingStartMinutes = timeToMinutes(timetable.start_time);
      const existingEndMinutes = timeToMinutes(timetable.end_time);
      
      // Check if times overlap
      const timeOverlap = (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes);
      
      // Check for resource conflicts
      const teacherConflict = timetable.teacher_id === teacherId;
      const roomConflict = timetable.room_id === roomId;
      const classConflict = timetable.class_id === classId;
      
      return timeOverlap && (teacherConflict || roomConflict || classConflict);
    });
    
    if (hasConflict) {
      return res.status(409).json({
        error: 'Timetable conflict detected',
        message: 'The requested timetable slot conflicts with an existing schedule'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Timetable conflict check error:', error);
    res.status(500).json({ error: 'Failed to check timetable conflicts' });
  }
};

// Enhanced timetable validation rules
const validateTimetableRules = (req, res, next) => {
  try {
    const { 
      startTime, 
      endTime, 
      startDate, 
      endDate 
    } = req.body;
    
    // Convert time strings to minutes for easier comparison
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Validate time duration (minimum 30 minutes, maximum 4 hours)
    const duration = endMinutes - startMinutes;
    if (duration < 30) {
      return res.status(400).json({
        error: 'Invalid timetable duration',
        message: 'Timetable slot must be at least 30 minutes long'
      });
    }
    
    if (duration > 240) {
      return res.status(400).json({
        error: 'Invalid timetable duration',
        message: 'Timetable slot cannot exceed 4 hours'
      });
    }
    
    // Validate date range (maximum one academic year)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const timeDiff = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (diffDays > 365) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'Timetable date range cannot exceed one academic year'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Timetable rule validation error:', error);
    res.status(500).json({ error: 'Failed to validate timetable rules' });
  }
};

module.exports = {
  validateRequest,
  timetableValidationSchema,
  attendanceValidationSchema,
  documentValidationSchema,
  checkTimetableConflicts,
  validateTimetableRules
};