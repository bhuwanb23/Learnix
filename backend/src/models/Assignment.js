const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Assignment = sequelize.define('assignment', {
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
    type: DataTypes.TEXT,
    allowNull: false
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
  assigned_by: {
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
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  assigned_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  max_points: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  attachments: {
    type: DataTypes.JSON
  },
  submissions: {
    type: DataTypes.JSON
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'assignments',
  timestamps: true,
  underscored: true
});

module.exports = Assignment;