const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AssignmentSubmission = sequelize.define('assignment_submission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assignment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'assignments',
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
  submission_content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  submission_files: {
    type: DataTypes.JSON,
    allowNull: true
  },
  submission_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  grade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  max_grade: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 100.00
  },
  graded_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  graded_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  plagiarism_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  plagiarism_report: {
    type: DataTypes.JSON,
    allowNull: true
  },
  is_submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_graded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_late: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'assignment_submissions',
  timestamps: true,
  underscored: true
});

// Define associations
AssignmentSubmission.associate = (models) => {
  AssignmentSubmission.belongsTo(models.Assignment, {
    foreignKey: 'assignment_id',
    as: 'assignment'
  });
  
  AssignmentSubmission.belongsTo(models.User, {
    foreignKey: 'student_id',
    as: 'student'
  });
  
  AssignmentSubmission.belongsTo(models.User, {
    foreignKey: 'graded_by',
    as: 'grader'
  });
};

module.exports = AssignmentSubmission;