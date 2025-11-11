const { sequelize } = require('../config/db');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Test database connection
async function testDBConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Successfully connected to SQLite database');
    
    // Get database information
    const databaseName = sequelize.config.storage || 'SQLite database';
    console.log('📦 Database:', databaseName);
    
    // List tables
    const tables = await sequelize.getQueryInterface().showAllSchemas();
    console.log('📚 Tables:', tables);
    
    console.log('🔒 Database connection test completed');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDBConnection();
}

module.exports = testDBConnection;