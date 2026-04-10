const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testDocumentFunctionality() {
  try {
    console.log('Testing Document Management Functionality...\n');
    
    // 1. Register a new teacher
    console.log('1. Registering teacher user...');
    let teacherToken, teacherId;
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
      teacherId = teacherRegisterResponse.data.user.id.toString();
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data.error === 'User already exists') {
        // If user already exists, try to login
        console.log('Teacher already exists, trying to login...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
          email: 'doc.teacher@example.com',
          password: 'password123'
        });
        teacherToken = loginResponse.data.token;
        teacherId = loginResponse.data.user.id.toString();
        console.log('✅ Teacher login successful');
      } else {
        throw error;
      }
    }
    
    // 2. Register a student user
    console.log('2. Registering student user...');
    let studentToken, studentId;
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
      studentId = studentRegisterResponse.data.user.id.toString();
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data.error === 'User already exists') {
        // If user already exists, try to login
        console.log('Student already exists, trying to login...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
          email: 'doc.student@example.com',
          password: 'password123'
        });
        studentToken = loginResponse.data.token;
        studentId = loginResponse.data.user.id.toString();
        console.log('✅ Student login successful');
      } else {
        throw error;
      }
    }
    
    // 3. Create a test document file
    console.log('3. Creating test document file...');
    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, 'This is a test document for Learnix Academic System. It contains sample content for testing document upload, metadata extraction, and other document management features.');
    
    // 4. Upload document using form-data
    console.log('4. Uploading document...');
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('title', 'Test Document');
      formData.append('description', 'This is a test document');
      formData.append('courseId', '1');
      formData.append('classId', '101');
      formData.append('subjectId', '1');
      formData.append('isPublic', 'true');
      formData.append('tags', JSON.stringify(['test', 'document']));
      formData.append('document', fs.createReadStream(testFilePath));
      
      const uploadResponse = await axios.post('http://localhost:3000/api/documents', formData, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`,
          ...formData.getHeaders()
        }
      });
      
      console.log('✅ Document upload successful');
      console.log(`   Document ID: ${uploadResponse.data.id}`);
      const documentId = uploadResponse.data.id;
      
      // 5. Test getting all documents
      console.log('5. Testing get all documents...');
      const documentsResponse = await axios.get('http://localhost:3000/api/documents', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Get all documents successful');
      console.log(`   Found ${documentsResponse.data.documents.length} documents`);
      
      // 6. Test search and filtering
      console.log('6. Testing document search and filtering...');
      const searchResponse = await axios.get('http://localhost:3000/api/documents?search=test', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document search successful');
      
      // 7. Test document versions
      console.log('7. Testing document versions...');
      const versionsResponse = await axios.get(`http://localhost:3000/api/documents/${documentId}/versions`, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document versions endpoint accessible');
      
      // 8. Test document preview
      console.log('8. Testing document preview...');
      const previewResponse = await axios.get(`http://localhost:3000/api/documents/${documentId}/preview`, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document preview endpoint accessible');
      
      // 9. Test document download
      console.log('9. Testing document download...');
      const downloadResponse = await axios.get(`http://localhost:3000/api/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document download endpoint accessible');
      
      // 10. Test access control
      console.log('10. Testing access control...');
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
      
      // 11. Test document sharing
      console.log('11. Testing document sharing...');
      const shareResponse = await axios.post(`http://localhost:3000/api/documents/${documentId}/share`, {
        userIds: [studentId],
        accessLevel: 'shared'
      }, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document sharing successful');
      
      // 12. Test updating document
      console.log('12. Testing document update...');
      const updateResponse = await axios.put(`http://localhost:3000/api/documents/${documentId}`, {
        title: 'Updated Test Document',
        description: 'This is an updated test document'
      }, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Document update successful');
      
    } catch (error) {
      console.log('❌ Error during document operations:', error.response?.data || error.message);
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    console.log('\n🎉 Document functionality tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDocumentFunctionality();