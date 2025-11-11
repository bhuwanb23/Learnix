const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Quiz = sequelize.define('quiz', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id'
    }
  },
  class_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'classes',
      key: 'id'
    }
  },
  subject_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'subjects',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_to: {
    type: DataTypes.JSON
  },
  questions: {
    type: DataTypes.JSON
  },
  duration: {
    type: DataTypes.INTEGER // in minutes
  },
  start_date: {
    type: DataTypes.DATE
  },
  end_date: {
    type: DataTypes.DATE
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_graded: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  max_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  tableName: 'quizzes',
  timestamps: true,
  underscored: true
});

module.exports = Quiz;