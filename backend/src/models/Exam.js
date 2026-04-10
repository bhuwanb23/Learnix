const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Exam = sequelize.define('exam', {
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
  scheduled_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  exam_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  start_time: {
    type: DataTypes.STRING,
    allowNull: false
  },
  end_time: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER // in minutes
  },
  max_points: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  exam_type: {
    type: DataTypes.ENUM('midterm', 'final', 'quiz', 'practical'),
    allowNull: false
  },
  room_number: {
    type: DataTypes.STRING
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  results_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'exams',
  timestamps: true,
  underscored: true
});

// Define associations
Exam.associate = (models) => {
  Exam.belongsTo(models.User, {
    foreignKey: 'scheduled_by',
    as: 'scheduler'
  });
  
  Exam.belongsTo(models.Course, {
    foreignKey: 'course_id'
  });
  
  Exam.belongsTo(models.Class, {
    foreignKey: 'class_id'
  });
  
  Exam.belongsTo(models.Subject, {
    foreignKey: 'subject_id'
  });
  
  Exam.hasMany(models.ExamResult, {
    foreignKey: 'exam_id',
    as: 'results'
  });
};

module.exports = Exam;