const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number // in minutes
  },
  maxPoints: {
    type: Number,
    default: 100
  },
  examType: {
    type: String,
    enum: ['midterm', 'final', 'quiz', 'practical'],
    required: true
  },
  roomNumber: {
    type: String
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  resultsPublished: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

examSchema.index({ courseId: 1 });
examSchema.index({ classId: 1 });
examSchema.index({ subjectId: 1 });
examSchema.index({ examDate: 1 });

module.exports = mongoose.model('Exam', examSchema);