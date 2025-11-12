const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Draft = sequelize.define('draft', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
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
    references: {
      model: 'subjects',
      key: 'id'
    }
  },
  assignment_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'assignments',
      key: 'id'
    }
  },
  course_id: {
    type: DataTypes.INTEGER,
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
  draft_type: {
    type: DataTypes.ENUM('essay', 'report', 'research_paper', 'assignment', 'other'),
    defaultValue: 'essay'
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'reviewed', 'revised'),
    defaultValue: 'draft'
  },
  word_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  character_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  parent_draft_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'drafts',
      key: 'id'
    }
  },
  // AI analysis fields
  ai_analysis_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  ai_feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ai_improvement_suggestions: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ai_detected_plagiarism: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  ai_grammar_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  ai_clarity_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  ai_coherence_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  ai_originality_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  // Feedback and revision tracking
  feedback_history: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  revision_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  is_collaborative: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  collaborators: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  tableName: 'drafts',
  timestamps: true,
  underscored: true
});

// Define associations
Draft.associate = (models) => {
  Draft.belongsTo(models.User, {
    foreignKey: 'student_id',
    as: 'student'
  });
  
  Draft.belongsTo(models.Subject, {
    foreignKey: 'subject_id'
  });
  
  Draft.belongsTo(models.Assignment, {
    foreignKey: 'assignment_id'
  });
  
  Draft.belongsTo(models.Course, {
    foreignKey: 'course_id'
  });
  
  Draft.belongsTo(models.Class, {
    foreignKey: 'class_id'
  });
  
  Draft.hasMany(models.Draft, {
    foreignKey: 'parent_draft_id',
    as: 'revisions'
  });
  
  Draft.belongsTo(models.Draft, {
    foreignKey: 'parent_draft_id',
    as: 'parent'
  });
};

module.exports = Draft;