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
  },
  // Disable alter mode in test environment to prevent schema conflicts
  sync: {
    force: false,
    alter: process.env.NODE_ENV !== 'test'
  }
});

// Function to connect to database with graceful handling
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Try to sync with alter first (for development)
    if (process.env.NODE_ENV !== 'test') {
      try {
        await sequelize.sync({ alter: true });
        logger.info('Database synchronized successfully with schema updates');
      } catch (syncError) {
        logger.warn('Failed to sync with alter, falling back to regular sync:', syncError.message);
        // If alter fails, try regular sync
        await sequelize.sync({ force: false });
        logger.info('Database synchronized without schema changes');
      }
    } else {
      // In test environment, just sync without altering
      await sequelize.sync({ force: false });
      logger.info('Database synchronized in test mode');
    }
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    // Don't exit in test environment to avoid breaking tests
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

module.exports = {
  sequelize,
  connectDB
};