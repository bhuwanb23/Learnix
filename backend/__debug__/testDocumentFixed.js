const axios = require('axios');

async function testDocumentFunctionality() {
  try {
    console.log('Testing Document Management Functionality...\n');
    
    // First, let's try to login with existing users
    console.log('1. Logging in as admin...');
    let adminToken;
    try {
      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'admin@example.com',
        password: 'admin123'
      });
      adminToken = loginResponse.data.token;
      console.log('✅ Admin login successful');
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data || error.message);
      return;
    }
    
    // Test getting all documents
    console.log('2. Testing get all documents...');
    try {
      const documentsResponse = await axios.get('http://localhost:3000/api/documents', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      console.log('✅ Get all documents successful');
      console.log(`   Found ${documentsResponse.data.documents.length} documents`);
    } catch (error) {
      console.log('❌ Error getting documents:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Document functionality tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDocumentFunctionality();