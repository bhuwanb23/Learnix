const axios = require('axios');
const seedDatabase = require('../src/utils/seedSQLite');

// Test suite for exam functionality
describe('Exam API', () => {
  let teacherToken, studentToken;
  let teacherId, studentId;
  let courseId, subjectId, classId;
  let examId;
  
  // Before all tests, register users and get tokens
  beforeAll(async () => {
    try {
      // Seed database with test data
      const seededData = await seedDatabase();
      courseId = seededData.courseId;
      subjectId = seededData.subjectId;
      classId = seededData.classId;
      teacherId = seededData.teacherId;
      
      // Register and login as teacher
      const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
        firstName: 'Test',
        lastName: 'Teacher',
        email: 'test.teacher@learnix.edu',
        password: 'password123',
        role: 'teacher'
      });
      
      const teacherLoginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test.teacher@learnix.edu',
        password: 'password123'
      });
      
      teacherToken = teacherLoginResponse.data.token;
      
      // Register and login as student
      const studentRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
        firstName: 'Test',
        lastName: 'Student',
        email: 'test.student@learnix.edu',
        password: 'password123',
        role: 'student'
      });
      
      const studentLoginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test.student@learnix.edu',
        password: 'password123'
      });
      
      studentToken = studentLoginResponse.data.token;
      studentId = studentLoginResponse.data.user.id;
    } catch (error) {
      console.error('Error in beforeAll:', error.response?.data || error.message);
      throw error;
    }
  }, 30000);
  
  // Test creating an exam
  test('should create a new exam', async () => {
    const examData = {
      title: 'Midterm Exam',
      description: 'Data Structures Midterm Exam',
      course_id: courseId,
      subject_id: subjectId,
      class_id: classId,
      exam_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '11:00',
      duration: 120,
      max_points: 100,
      exam_type: 'midterm',
      room_number: 'A101'
    };
    
    const response = await axios.post('http://localhost:3000/api/exams', examData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(201);
    expect(response.data.title).toBe(examData.title);
    
    examId = response.data.id;
  }, 10000);
  
  // Test getting exams by class
  test('should get exams by class', async () => {
    const response = await axios.get(`http://localhost:3000/api/exams/class/${classId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  }, 10000);
  
  // Test getting exam by ID
  test('should get exam by ID', async () => {
    const response = await axios.get(`http://localhost:3000/api/exams/${examId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.id).toBe(examId);
    expect(response.data.title).toBe('Midterm Exam');
  }, 10000);
  
  // Test publishing an exam
  test('should publish an exam', async () => {
    const response = await axios.post(`http://localhost:3000/api/exams/${examId}/publish`, {}, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.is_published).toBe(true);
  }, 10000);
  
  // Test creating an exam result
  test('should create an exam result', async () => {
    const resultData = {
      student_id: studentId,
      marks_obtained: 85,
      max_marks: 100,
      grade: 'A',
      feedback: 'Good work!'
    };
    
    const response = await axios.post(`http://localhost:3000/api/exams/${examId}/results`, resultData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(201);
    expect(response.data.exam_id.toString()).toBe(examId.toString());
    expect(response.data.student_id.toString()).toBe(studentId.toString());
    expect(response.data.marks_obtained).toBe(85);
  }, 10000);
  
  // Test getting exam results by exam
  test('should get exam results by exam', async () => {
    const response = await axios.get(`http://localhost:3000/api/exams/${examId}/results`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  }, 10000);
  
  // Test updating an exam result
  test('should update an exam result', async () => {
    // First get the result ID
    const resultsResponse = await axios.get(`http://localhost:3000/api/exams/${examId}/results`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    const resultId = resultsResponse.data[0].id;
    
    const updateData = {
      marks_obtained: 90,
      feedback: 'Excellent work!'
    };
    
    const response = await axios.put(`http://localhost:3000/api/exams/results/${resultId}`, updateData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.marks_obtained).toBe(90);
    expect(response.data.feedback).toBe('Excellent work!');
  }, 10000);
  
  // Test publishing exam results
  test('should publish exam results', async () => {
    const response = await axios.post(`http://localhost:3000/api/exams/${examId}/results/publish`, {}, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.results_published).toBe(true);
  }, 10000);
  
  // Test getting exam statistics
  test('should get exam statistics', async () => {
    const response = await axios.get(`http://localhost:3000/api/exams/${examId}/statistics`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.examId.toString()).toBe(examId.toString());
    expect(response.data.totalStudents).toBeGreaterThanOrEqual(1);
  }, 10000);
  
  // Test getting exam calendar
  test('should get exam calendar', async () => {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(`http://localhost:3000/api/exams/class/${classId}/calendar?startDate=${startDate}&endDate=${endDate}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  }, 10000);
  
  // Test updating an exam
  test('should update an exam', async () => {
    const updateData = {
      title: 'Updated Midterm Exam',
      description: 'Updated Data Structures Midterm Exam'
    };
    
    const response = await axios.put(`http://localhost:3000/api/exams/${examId}`, updateData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.title).toBe('Updated Midterm Exam');
  }, 10000);
});