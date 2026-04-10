const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StudentPerformance = sequelize.define('student_performance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
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
  // Performance metrics
  total_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  correct_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  accuracy_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  average_time_per_question: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true
  },
  // Weakness indicators
  is_weak_topic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  weakness_level: {
    type: DataTypes.ENUM('mild', 'moderate', 'severe'),
    defaultValue: 'mild'
  },
  // Last assessment date
  last_assessed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // Confidence level (0-100)
  confidence_level: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 50.00
  },
  // Detailed performance breakdown
  performance_details: {
    type: DataTypes.JSON
  },
  // Is this performance record active
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'student_performance',
  timestamps: true,
  underscored: true
});

// Define relationships using association function to avoid circular dependencies
StudentPerformance.associate = (models) => {
  StudentPerformance.belongsTo(models.User, { foreignKey: 'student_id', as: 'student' });
  StudentPerformance.belongsTo(models.Subject, { foreignKey: 'subject_id' });
};

module.exports = StudentPerformance;