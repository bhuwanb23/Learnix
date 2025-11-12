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
    type: DataTypes.TEXT,
    allowNull: true
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
  duration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: true
  },
  total_marks: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  passing_marks: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  difficulty_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'intermediate'
  },
  question_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  starts_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  allow_multiple_attempts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  shuffle_questions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  show_correct_answers: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  show_explanations: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'quizzes',
  timestamps: true,
  underscored: true
});

// Define relationships using association function to avoid circular dependencies
Quiz.associate = (models) => {
  Quiz.belongsTo(models.Subject, { foreignKey: 'subject_id' });
  Quiz.belongsTo(models.Class, { foreignKey: 'class_id' });
  Quiz.belongsTo(models.User, { foreignKey: 'teacher_id', as: 'teacher' });
  Quiz.hasMany(models.Question, { foreignKey: 'quiz_id', as: 'questions' });
  Quiz.hasMany(models.QuizAttempt, { foreignKey: 'quiz_id', as: 'attempts' });
};

module.exports = Quiz;