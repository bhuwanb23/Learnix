const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
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
  department: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in years
    required: true
  },
  credits: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
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

courseSchema.index({ code: 1 });
courseSchema.index({ department: 1 });
courseSchema.index({ name: 1 });

module.exports = mongoose.model('Course', courseSchema);