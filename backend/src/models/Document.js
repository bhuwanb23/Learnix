const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Document = sequelize.define('document', {
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
    type: DataTypes.STRING,
    allowNull: true
  },
  class_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subject_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_size: {
    type: DataTypes.INTEGER
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.JSON
  },
  metadata: {
    type: DataTypes.JSON
  },
  // For document sharing and access control
  shared_with: {
    type: DataTypes.JSON, // Array of user IDs or roles
    defaultValue: []
  },
  access_level: {
    type: DataTypes.ENUM('private', 'shared', 'public'),
    defaultValue: 'private'
  },
  // For document preview
  preview_path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  preview_type: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true
});

module.exports = Document;