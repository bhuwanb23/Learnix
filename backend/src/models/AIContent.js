const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AIContent = sequelize.define('ai_content', {
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
  chapter_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  topic_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  content_type: {
    type: DataTypes.ENUM('summary', 'explanation', 'example', 'exercise'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  keywords: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  difficulty_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'intermediate'
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en'
  },
  quality_score: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00
  },
  generation_metadata: {
    type: DataTypes.JSON
  },
  is_cached: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  expires_at: {
    type: DataTypes.DATE
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ai_content',
  timestamps: true,
  underscored: true
});

module.exports = AIContent;