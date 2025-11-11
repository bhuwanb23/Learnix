const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Test database connection
async function testDBConnection() {
  try {
    await mongoose.connect(process.env.DB_HOST || 'mongodb://localhost:27017/learnix_academic', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Successfully connected to MongoDB');
    console.log('📦 Database name:', mongoose.connection.name);
    console.log('📍 Host:', mongoose.connection.host);
    console.log('🔌 Port:', mongoose.connection.port);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
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