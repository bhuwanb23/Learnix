const axios = require('axios');

async function testRoute() {
  try {
    // Register a new teacher
    const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Route',
      lastName: 'Teacher',
      email: 'route.teacher@example.com',
      password: 'password123',
      role: 'teacher'
    });
    
    const teacherToken = teacherRegisterResponse.data.token;
    console.log('Teacher registered successfully');
    
    // Test the attendance root endpoint
    try {
      const response = await axios.get('http://localhost:3000/api/attendance', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      console.log('Attendance root endpoint:', response.data);
    } catch (error) {
      console.log('Attendance root endpoint error:', error.response?.data || error.message);
    }
    
    // Test the attendance stats endpoint
    try {
      const response = await axios.get('http://localhost:3000/api/attendance/stats', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      console.log('Attendance stats endpoint:', response.data);
    } catch (error) {
      console.log('Attendance stats endpoint error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

testRoute();