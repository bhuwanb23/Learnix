const axios = require('axios');

async function simpleTest() {
  try {
    console.log('Testing basic endpoint...');
    const response = await axios.get('http://localhost:3000/');
    console.log('Root endpoint response:', response.data);
    
    console.log('Testing stats endpoint...');
    // First register a user to get a token
    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user@example.com',
      password: 'password123',
      role: 'teacher'
    });
    
    const token = registerResponse.data.token;
    console.log('User registered, token received');
    
    // Now test the stats endpoint
    const statsResponse = await axios.get('http://localhost:3000/api/attendance/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Stats endpoint response:', statsResponse.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

simpleTest();