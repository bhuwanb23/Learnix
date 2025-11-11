const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filePath: {
    type: String
  },
  fileName: {
    type: String
  },
  fileContent: {
    type: String
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  grade: {
    type: Number
  },
  feedback: {
    type: String
  },
  isGraded: {
    type: Boolean,
    default: false
  },
  plagiarismScore: {
    type: Number
  }
});

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
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
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dueDate: {
    type: Date,
    required: true
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  maxPoints: {
    type: Number,
    default: 100
  },
  attachments: [{
    fileName: String,
    filePath: String,
    fileSize: Number
  }],
  submissions: [submissionSchema],
  isPublished: {
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

assignmentSchema.index({ courseId: 1 });
assignmentSchema.index({ classId: 1 });
assignmentSchema.index({ subjectId: 1 });
assignmentSchema.index({ assignedBy: 1 });
assignmentSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);