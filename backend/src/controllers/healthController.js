const { sequelize } = require('../config/db');
const logger = require('../config/logger');

const healthCheck = async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();
    
    // Check uptime
    const uptime = process.uptime();
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      database: {
        status: 'connected',
        dialect: sequelize.getDialect()
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    };
    
    logger.info('Health check completed', healthData);
    res.json(healthData);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
};

module.exports = {
  healthCheck
};