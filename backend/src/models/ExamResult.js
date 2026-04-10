const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ExamResult = sequelize.define('exam_result', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  exam_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'exams',
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
  marks_obtained: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  max_marks: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 100.00
  },
  grade: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pass', 'fail', 'absent'),
    defaultValue: 'absent'
  },
  evaluated_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  evaluated_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  published_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  audit_trail: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'exam_results',
  timestamps: true,
  underscored: true
});

// Define associations
ExamResult.associate = (models) => {
  ExamResult.belongsTo(models.Exam, {
    foreignKey: 'exam_id',
    as: 'exam'
  });
  
  ExamResult.belongsTo(models.User, {
    foreignKey: 'student_id',
    as: 'student'
  });
  
  ExamResult.belongsTo(models.User, {
    foreignKey: 'evaluated_by',
    as: 'evaluator'
  });
};

module.exports = ExamResult;