const Joi = require('joi');

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
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
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

module.exports = {
  validateRequest,
  timetableValidationSchema,
  attendanceValidationSchema,
  documentValidationSchema
};