const axios = require('axios');

async function createAdminUser() {
  try {
    console.log('Creating admin user...\n');
    
    // Register admin user
    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });
    
    console.log('✅ Admin user created successfully');
    console.log('Token:', registerResponse.data.token);
    
  } catch (error) {
    if (error.response && error.response.status === 400 && error.response.data.error === 'User already exists') {
      console.log('Admin user already exists');
      
      // Try to login
      try {
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
          email: 'admin@example.com',
          password: 'admin123'
        });
        
        console.log('✅ Admin login successful');
        console.log('Token:', loginResponse.data.token);
      } catch (loginError) {
        console.log('❌ Admin login failed:', loginError.response?.data || loginError.message);
      }
    } else {
      console.log('❌ Admin registration failed:', error.response?.data || error.message);
    }
  }
}

createAdminUser();