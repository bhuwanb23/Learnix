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
const AssignmentSubmission = require('./AssignmentSubmission');
const Attendance = require('./Attendance');
const Document = require('./Document');
const Exam = require('./Exam');
const ExamResult = require('./ExamResult');
const SyllabusProgress = require('./SyllabusProgress');
const Timetable = require('./Timetable');
const TimetableHistory = require('./TimetableHistory');
const StudentPerformance = require('./StudentPerformance');

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
  AssignmentSubmission,
  Attendance,
  Document,
  Exam,
  ExamResult,
  SyllabusProgress,
  Timetable,
  TimetableHistory,
  StudentPerformance
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export sequelize instance and models
module.exports = {
  sequelize,
  ...models
};