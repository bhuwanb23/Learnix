const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  semester: {
    type: Number,
    required: true
  },
  credits: {
    type: Number,
    required: true
  },
  syllabus: [{
    topic: String,
    description: String,
    duration: Number // in hours
  }],
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  isActive: {
    type: Boolean,
    default: true
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

subjectSchema.index({ code: 1 });
subjectSchema.index({ courseId: 1 });
subjectSchema.index({ semester: 1 });

module.exports = mongoose.model('Subject', subjectSchema);