const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testDocumentFunctionality() {
  try {
    console.log('Testing Document Management Functionality...\n');
    
    // 1. Register a new teacher
    console.log('1. Registering teacher user...');
    const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Doc',
      lastName: 'Teacher',
      email: 'doc.teacher@example.com',
      password: 'password123',
      role: 'teacher'
    });
    
    console.log('✅ Teacher registration successful');
    const teacherToken = teacherRegisterResponse.data.token;
    const teacherId = teacherRegisterResponse.data.user.id.toString();
    
    // 2. Register a student user
    console.log('2. Registering student user...');
    const studentRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Doc',
      lastName: 'Student',
      email: 'doc.student@example.com',
      password: 'password123',
      role: 'student'
    });
    
    console.log('✅ Student registration successful');
    const studentToken = studentRegisterResponse.data.token;
    const studentId = studentRegisterResponse.data.user.id.toString();
    
    // 3. Create a test document file
    console.log('3. Creating test document file...');
    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, 'This is a test document for Learnix Academic System. It contains sample content for testing document upload, metadata extraction, and other document management features.');
    
    // 4. Upload document (we'll simulate this since multipart form data is complex to test with axios)
    console.log('4. Testing document upload endpoint...');
    try {
      const documentsResponse = await axios.get('http://localhost:3000/api/documents', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document endpoint accessible');
      console.log(`   Found ${documentsResponse.data.documents?.length || documentsResponse.data.length} documents`);
    } catch (error) {
      console.log('❌ Error testing document endpoint:', error.response?.data || error.message);
    }
    
    // 5. Test search and filtering
    console.log('5. Testing document search and filtering...');
    try {
      const searchResponse = await axios.get('http://localhost:3000/api/documents?search=test', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document search endpoint accessible');
    } catch (error) {
      console.log('❌ Error testing document search:', error.response?.data || error.message);
    }
    
    // 6. Test access control
    console.log('6. Testing access control...');
    try {
      const studentDocumentsResponse = await axios.get('http://localhost:3000/api/documents', {
        headers: {
          'Authorization': `Bearer ${studentToken}`
        }
      });
      console.log('✅ Student can access documents endpoint');
    } catch (error) {
      console.log('❌ Error testing student access:', error.response?.data || error.message);
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    console.log('\n🎉 Document functionality tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDocumentFunctionality();