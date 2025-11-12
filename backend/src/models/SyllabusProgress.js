const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Subject = require('./Subject');
const Class = require('./Class');
const User = require('./User');

const SyllabusProgress = sequelize.define('syllabus_progress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subjects',
      key: 'id'
    }
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'classes',
      key: 'id'
    }
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Store detailed syllabus structure as JSON
  syllabus_structure: {
    type: DataTypes.JSON,
    allowNull: false
  },
  // Overall completion percentage
  overall_progress: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  // Progress by chapters/topics
  progress_details: {
    type: DataTypes.JSON
  },
  // Start date of syllabus coverage
  start_date: {
    type: DataTypes.DATE
  },
  // Expected end date
  expected_end_date: {
    type: DataTypes.DATE
  },
  // Actual end date (when 100% completed)
  actual_end_date: {
    type: DataTypes.DATE
  },
  // Status of syllabus progress
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'completed', 'behind_schedule'),
    defaultValue: 'not_started'
  },
  // Notes or comments about progress
  notes: {
    type: DataTypes.TEXT
  },
  // Is this progress record active
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'syllabus_progress',
  timestamps: true,
  underscored: true
});

// Define associations
SyllabusProgress.belongsTo(Subject, { foreignKey: 'subject_id' });
SyllabusProgress.belongsTo(Class, { foreignKey: 'class_id' });
SyllabusProgress.belongsTo(User, { foreignKey: 'teacher_id' });

module.exports = SyllabusProgress;