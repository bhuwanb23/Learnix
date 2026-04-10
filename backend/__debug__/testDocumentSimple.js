const axios = require('axios');

async function testDocumentFunctionality() {
  try {
    console.log('Testing Document Management Functionality...\n');
    
    // 1. Register a new teacher
    console.log('1. Registering teacher user...');
    let teacherToken;
    try {
      const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
        firstName: 'Doc',
        lastName: 'Teacher',
        email: `doc.teacher.${Date.now()}@example.com`,
        password: 'password123',
        role: 'teacher'
      });
      
      console.log('✅ Teacher registration successful');
      teacherToken = teacherRegisterResponse.data.token;
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data.error === 'User already exists') {
        // If user already exists, try to login
        console.log('Teacher already exists, trying to login...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
          email: 'doc.teacher@example.com',
          password: 'password123'
        });
        teacherToken = loginResponse.data.token;
        console.log('✅ Teacher login successful');
      } else {
        throw error;
      }
    }
    
    // 2. Register a student user
    console.log('2. Registering student user...');
    let studentToken;
    try {
      const studentRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
        firstName: 'Doc',
        lastName: 'Student',
        email: `doc.student.${Date.now()}@example.com`,
        password: 'password123',
        role: 'student'
      });
      
      console.log('✅ Student registration successful');
      studentToken = studentRegisterResponse.data.token;
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data.error === 'User already exists') {
        // If user already exists, try to login
        console.log('Student already exists, trying to login...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
          email: 'doc.student@example.com',
          password: 'password123'
        });
        studentToken = loginResponse.data.token;
        console.log('✅ Student login successful');
      } else {
        throw error;
      }
    }
    
    // 3. Test getting all documents (should work even without documents)
    console.log('3. Testing get all documents...');
    try {
      const documentsResponse = await axios.get('http://localhost:3000/api/documents', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Get all documents successful');
      console.log(`   Found ${documentsResponse.data.documents.length} documents`);
    } catch (error) {
      console.log('❌ Error getting documents:', error.response?.data || error.message);
    }
    
    // 4. Test search and filtering
    console.log('4. Testing document search and filtering...');
    try {
      const searchResponse = await axios.get('http://localhost:3000/api/documents?search=test', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document search successful');
    } catch (error) {
      console.log('❌ Error searching documents:', error.response?.data || error.message);
    }
    
    // 5. Test access control
    console.log('5. Testing access control...');
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
    
    console.log('\n🎉 Basic document functionality tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDocumentFunctionality();