const axios = require('axios');

async function testSyllabusFunctionality() {
  try {
    console.log('Testing Syllabus Management Functionality...\n');
    
    // 1. Register a new teacher
    console.log('1. Registering teacher user...');
    let teacherToken, teacherId;
    try {
      const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
        firstName: 'Syllabus',
        lastName: 'Teacher',
        email: `syllabus.teacher.${Date.now()}@example.com`,
        password: 'password123',
        role: 'teacher'
      });
      
      console.log('✅ Teacher registration successful');
      teacherToken = teacherRegisterResponse.data.token;
      teacherId = teacherRegisterResponse.data.user.id.toString();
    } catch (error) {
      console.log('❌ Teacher registration failed:', error.response?.data || error.message);
      return;
    }
    
    // 2. Test syllabus endpoints
    console.log('2. Testing syllabus endpoints...');
    
    // Test get syllabus progress (with dummy IDs)
    try {
      const progressResponse = await axios.get('http://localhost:3000/api/syllabus/progress/1/1', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Get syllabus progress endpoint accessible');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Get syllabus progress endpoint accessible (not found is expected)');
      } else {
        console.log('❌ Error testing syllabus progress endpoint:', error.response?.data || error.message);
      }
    }
    
    // Test update syllabus progress
    try {
      const progressData = {
        teacherId: teacherId,
        progress_details: {
          'chapter1': { completed: true, name: 'Introduction' },
          'chapter2': { completed: false, name: 'Data Structures' }
        },
        start_date: '2023-09-01',
        expected_end_date: '2023-12-31',
        notes: 'Making good progress'
      };
      
      const updateResponse = await axios.put(
        'http://localhost:3000/api/syllabus/progress/1/1',
        progressData,
        {
          headers: {
            'Authorization': `Bearer ${teacherToken}`
          }
        }
      );
      console.log('✅ Update syllabus progress endpoint accessible');
    } catch (error) {
      console.log('❌ Error testing update syllabus progress endpoint:', error.response?.data || error.message);
    }
    
    // Test get class analytics
    try {
      const analyticsResponse = await axios.get('http://localhost:3000/api/syllabus/analytics/1', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Get class analytics endpoint accessible');
    } catch (error) {
      console.log('❌ Error testing class analytics endpoint:', error.response?.data || error.message);
    }
    
    // Test get comparison data
    try {
      const comparisonResponse = await axios.get('http://localhost:3000/api/syllabus/comparison', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Get comparison data endpoint accessible');
    } catch (error) {
      console.log('❌ Error testing comparison data endpoint:', error.response?.data || error.message);
    }
    
    // Test generate progress report
    try {
      const reportResponse = await axios.get('http://localhost:3000/api/syllabus/reports/1', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Generate progress report endpoint accessible');
    } catch (error) {
      console.log('❌ Error testing progress report endpoint:', error.response?.data || error.message);
    }
    
    // Test get progress notifications
    try {
      const notificationsResponse = await axios.get('http://localhost:3000/api/syllabus/notifications', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      console.log('✅ Get progress notifications endpoint accessible');
    } catch (error) {
      console.log('❌ Error testing progress notifications endpoint:', error.response?.data || error.message);
    }
    
    // Test create progress notification
    try {
      const notificationData = {
        classId: '1',
        subjectId: '1',
        message: 'Test notification',
        priority: 'medium'
      };
      
      const createNotificationResponse = await axios.post(
        'http://localhost:3000/api/syllabus/notifications',
        notificationData,
        {
          headers: {
            'Authorization': `Bearer ${teacherToken}`
          }
        }
      );
      console.log('✅ Create progress notification endpoint accessible');
    } catch (error) {
      console.log('❌ Error testing create progress notification endpoint:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Syllabus functionality tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSyllabusFunctionality();