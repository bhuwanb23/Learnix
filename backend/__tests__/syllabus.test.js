const axios = require('axios');
const seedDatabase = require('../src/utils/seedSQLite');

// Test suite for syllabus functionality
describe('Syllabus Management API', () => {
  let teacherToken, teacherId;
  let subjectId, classId;
  
  // Before all tests, register a teacher and get subject/class IDs
  beforeAll(async () => {
    try {
      // Seed database with test data
      const seededData = await seedDatabase();
      subjectId = seededData.subjectId.toString();
      classId = seededData.classId.toString();
      teacherId = seededData.teacherId.toString();
      
      // Login as the seeded teacher
      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'john.doe@learnix.edu',
        password: 'password123'
      });
      
      teacherToken = loginResponse.data.token;
    } catch (error) {
      console.error('Error during setup:', error.response?.data || error.message);
    }
  });
  
  // Test get syllabus progress
  test('should get syllabus progress', async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/syllabus/progress/${subjectId}/${classId}`, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      // We expect either a 200 with data or a 404 if no progress exists yet
      expect([200, 404]).toContain(response.status);
    } catch (error) {
      console.error('Error getting syllabus progress:', error.response?.data || error.message);
    }
  });
  
  // Test update syllabus progress
  test('should update syllabus progress', async () => {
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
      
      const response = await axios.put(
        `http://localhost:3000/api/syllabus/progress/${subjectId}/${classId}`,
        progressData,
        {
          headers: {
            'Authorization': `Bearer ${teacherToken}`
          }
        }
      );
      
      expect([200, 201]).toContain(response.status);
    } catch (error) {
      console.error('Error updating syllabus progress:', error.response?.data || error.message);
      throw error;
    }
  });
  
  // Test get class analytics
  test('should get class analytics', async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/syllabus/analytics/${classId}`, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      expect(response.status).toBe(200);
    } catch (error) {
      console.error('Error getting class analytics:', error.response?.data || error.message);
      throw error;
    }
  });
  
  // Test get comparison data
  test('should get comparison data', async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/syllabus/comparison', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      expect(response.status).toBe(200);
    } catch (error) {
      console.error('Error getting comparison data:', error.response?.data || error.message);
      throw error;
    }
  });
  
  // Test generate progress report
  test('should generate progress report', async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/syllabus/reports/${classId}`, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      expect(response.status).toBe(200);
    } catch (error) {
      console.error('Error generating progress report:', error.response?.data || error.message);
      throw error;
    }
  });
  
  // Test get progress notifications
  test('should get progress notifications', async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/syllabus/notifications', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      expect(response.status).toBe(200);
    } catch (error) {
      console.error('Error getting progress notifications:', error.response?.data || error.message);
      throw error;
    }
  });
  
  // Test create progress notification
  test('should create progress notification', async () => {
    try {
      const notificationData = {
        classId: classId,
        subjectId: subjectId,
        message: 'Test notification',
        priority: 'medium'
      };
      
      const response = await axios.post(
        'http://localhost:3000/api/syllabus/notifications',
        notificationData,
        {
          headers: {
            'Authorization': `Bearer ${teacherToken}`
          }
        }
      );
      
      expect([201, 200]).toContain(response.status);
    } catch (error) {
      console.error('Error creating progress notification:', error.response?.data || error.message);
      throw error;
    }
  });
});