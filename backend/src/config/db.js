const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('./logger');

// Initialize SQLite database with absolute path to ensure consistency
const dbPath = path.resolve(__dirname, '..', '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE || dbPath,
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// Function to connect to database
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Sync all models
    await sequelize.sync({ alter: true });
    logger.info('Database synchronized successfully');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB
};