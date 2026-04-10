const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const TimetableHistory = require('./TimetableHistory');

const Timetable = sequelize.define('timetable', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  }
}, {
  tableName: 'timetables',
  timestamps: true,
  underscored: true
});

// Hook to create history record before updating
Timetable.beforeUpdate(async (timetable, options) => {
  // Only create history if it's an actual update (not a new record)
  if (timetable._previousDataValues) {
    const historyData = {
      timetable_id: timetable.id,
      course_id: timetable._previousDataValues.course_id,
      class_id: timetable._previousDataValues.class_id,
      subject_id: timetable._previousDataValues.subject_id,
      teacher_id: timetable._previousDataValues.teacher_id,
      room_id: timetable._previousDataValues.room_id,
      day_of_week: timetable._previousDataValues.day_of_week,
      start_time: timetable._previousDataValues.start_time,
      end_time: timetable._previousDataValues.end_time,
      start_date: timetable._previousDataValues.start_date,
      end_date: timetable._previousDataValues.end_date,
      is_active: timetable._previousDataValues.is_active,
      action: 'updated',
      changed_by: options.userId || null // Get user ID from options if available
    };
    
    await TimetableHistory.create(historyData);
  }
});

// Hook to create history record before deleting
Timetable.beforeDestroy(async (timetable, options) => {
  const historyData = {
    timetable_id: timetable.id,
    course_id: timetable.course_id,
    class_id: timetable.class_id,
    subject_id: timetable.subject_id,
    teacher_id: timetable.teacher_id,
    room_id: timetable.room_id,
    day_of_week: timetable.day_of_week,
    start_time: timetable.start_time,
    end_time: timetable.end_time,
    start_date: timetable.start_date,
    end_date: timetable.end_date,
    is_active: timetable.is_active,
    action: 'deleted',
    changed_by: options.userId || null // Get user ID from options if available
  };
  
  await TimetableHistory.create(historyData);
});

module.exports = Timetable;