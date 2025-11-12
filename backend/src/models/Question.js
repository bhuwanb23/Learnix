const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Question = sequelize.define('question', {
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
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  question_type: {
    type: DataTypes.ENUM('mcq', 'true_false', 'short_answer', 'long_answer'),
    defaultValue: 'mcq'
  },
  difficulty_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'intermediate'
  },
  marks: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.00
  },
  options: {
    type: DataTypes.JSON, // For MCQ: [{text: "Option A", is_correct: true}, ...]
    allowNull: true
  },
  correct_answer: {
    type: DataTypes.TEXT, // For non-MCQ questions
    allowNull: true
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'questions',
  timestamps: true,
  underscored: true
});

// Define relationships using association function to avoid circular dependencies
Question.associate = (models) => {
  Question.belongsTo(models.Quiz, { foreignKey: 'quiz_id' });
  // Note: Questions don't directly have many attempts, attempts are linked to quizzes
};

module.exports = Question;