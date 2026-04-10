const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Attendance = sequelize.define('attendance', {
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
  student_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
    allowNull: false
  },
  method: {
    type: DataTypes.ENUM('manual', 'qr', 'nfc', 'face_recognition'),
    defaultValue: 'manual'
  },
  recorded_by: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'attendances',
  timestamps: true,
  underscored: true
});

module.exports = Attendance;