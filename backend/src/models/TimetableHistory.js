const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TimetableHistory = sequelize.define('timetable_history', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timetable_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  course_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  class_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teacher_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  room_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  day_of_week: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 6
    }
  },
  start_time: {
    type: DataTypes.STRING,
    allowNull: false
  },
  end_time: {
    type: DataTypes.STRING,
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  action: {
    type: DataTypes.ENUM('created', 'updated', 'deleted'),
    allowNull: false
  },
  changed_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  change_reason: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'timetable_histories',
  timestamps: true,
  underscored: true
});

module.exports = TimetableHistory;