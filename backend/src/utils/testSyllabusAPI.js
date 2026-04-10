const axios = require('axios');

async function testSyllabusAPI() {
  try {
    console.log('Testing Syllabus API endpoints...\n');
    
    // Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'john.doe@learnix.edu',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Test get syllabus progress (should return 404 as no progress exists yet)
    console.log('2. Testing GET /api/syllabus/progress/1/1...');
    try {
      const progressResponse = await axios.get('http://localhost:3000/api/syllabus/progress/1/1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Progress retrieved:', progressResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Progress not found (expected for new records)');
      } else {
        console.log('❌ Error getting progress:', error.response?.data || error.message);
      }
    }
    
    // Test update syllabus progress
    console.log('\n3. Testing PUT /api/syllabus/progress/1/1...');
    const progressData = {
      teacherId: '1',
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
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('✅ Progress updated:', updateResponse.data);
    
    // Test get syllabus progress again (should now return data)
    console.log('\n4. Testing GET /api/syllabus/progress/1/1 again...');
    const progressResponse2 = await axios.get('http://localhost:3000/api/syllabus/progress/1/1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Progress retrieved:', progressResponse2.data);
    
    // Test get class analytics
    console.log('\n5. Testing GET /api/syllabus/analytics/1...');
    const analyticsResponse = await axios.get('http://localhost:3000/api/syllabus/analytics/1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Analytics retrieved:', analyticsResponse.data);
    
    // Test get comparison data
    console.log('\n6. Testing GET /api/syllabus/comparison...');
    const comparisonResponse = await axios.get('http://localhost:3000/api/syllabus/comparison', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Comparison data retrieved:', comparisonResponse.data);
    
    // Test generate progress report
    console.log('\n7. Testing GET /api/syllabus/reports/1...');
    const reportResponse = await axios.get('http://localhost:3000/api/syllabus/reports/1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Report generated:', reportResponse.data);
    
    // Test get progress notifications
    console.log('\n8. Testing GET /api/syllabus/notifications...');
    const notificationsResponse = await axios.get('http://localhost:3000/api/syllabus/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Notifications retrieved:', notificationsResponse.data);
    
    // Test create progress notification
    console.log('\n9. Testing POST /api/syllabus/notifications...');
    const notificationData = {
      classId: '1',
      subjectId: '1',
      message: 'Test notification from API test',
      priority: 'medium'
    };
    
    const createNotificationResponse = await axios.post(
      'http://localhost:3000/api/syllabus/notifications',
      notificationData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('✅ Notification created:', createNotificationResponse.data);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSyllabusAPI();
}

module.exports = testSyllabusAPI;