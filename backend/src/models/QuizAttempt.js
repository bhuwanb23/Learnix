const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const QuizAttempt = sequelize.define('quiz_attempt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quiz_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quizzes',
      key: 'id'
    }
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
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
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  time_taken: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true
  },
  total_marks: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  marks_obtained: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('started', 'in_progress', 'completed', 'submitted'),
    defaultValue: 'started'
  },
  is_passed: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  answers: {
    type: DataTypes.JSON, // [{question_id: 1, answer: "Option A", is_correct: true}, ...]
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'quiz_attempts',
  timestamps: true,
  underscored: true
});

// Define relationships using association function to avoid circular dependencies
QuizAttempt.associate = (models) => {
  QuizAttempt.belongsTo(models.Quiz, { foreignKey: 'quiz_id' });
  QuizAttempt.belongsTo(models.User, { foreignKey: 'student_id', as: 'student' });
  QuizAttempt.belongsTo(models.Class, { foreignKey: 'class_id' });
};

module.exports = QuizAttempt;