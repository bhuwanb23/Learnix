const { sequelize } = require('../config/db');

// Load models in specific order to avoid circular dependency issues
const User = require('./User');
const Course = require('./Course');
const Subject = require('./Subject');
const Class = require('./Class');
const Quiz = require('./Quiz');
const Question = require('./Question');
const QuizAttempt = require('./QuizAttempt');
const AIContent = require('./AIContent');
const Assignment = require('./Assignment');
const Attendance = require('./Attendance');
const Document = require('./Document');
const Exam = require('./Exam');
const SyllabusProgress = require('./SyllabusProgress');
const Timetable = require('./Timetable');
const TimetableHistory = require('./TimetableHistory');

// Create models object
const models = {
  User,
  Course,
  Subject,
  Class,
  Quiz,
  Question,
  QuizAttempt,
  AIContent,
  Assignment,
  Attendance,
  Document,
  Exam,
  SyllabusProgress,
  Timetable,
  TimetableHistory
};

// Call associate function on all models if it exists
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Add sequelize instance to models
models.sequelize = sequelize;

module.exports = models;