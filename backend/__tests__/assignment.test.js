const axios = require('axios');
const seedDatabase = require('../src/utils/seedSQLite');

// Test suite for assignment functionality
describe('Assignment API', () => {
  let teacherToken, studentToken;
  let teacherId, studentId;
  let courseId, subjectId, classId;
  let assignmentId;
  
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
  
  // Test creating an assignment
  test('should create a new assignment', async () => {
    const assignmentData = {
      title: 'Test Assignment',
      description: 'This is a test assignment',
      course_id: courseId,
      subject_id: subjectId,
      class_id: classId,
      assigned_to: [studentId],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      max_points: 100
    };
    
    const response = await axios.post('http://localhost:3000/api/assignments', assignmentData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(201);
    expect(response.data.title).toBe(assignmentData.title);
    
    assignmentId = response.data.id;
  }, 10000);
  
  // Test getting assignments by course
  test('should get assignments by course', async () => {
    const response = await axios.get(`http://localhost:3000/api/assignments/course/${courseId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  }, 10000);
  
  // Test getting assignment by ID
  test('should get assignment by ID', async () => {
    const response = await axios.get(`http://localhost:3000/api/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.id).toBe(assignmentId);
    expect(response.data.title).toBe('Test Assignment');
  }, 10000);
  
  // Test submitting an assignment
  test('should submit an assignment', async () => {
    const submissionData = {
      content: 'This is my assignment submission',
      files: []
    };
    
    const response = await axios.post(`http://localhost:3000/api/assignments/${assignmentId}/submit`, submissionData, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    expect(response.status).toBe(201);
    expect(response.data.assignment_id.toString()).toBe(assignmentId.toString());
    expect(response.data.student_id.toString()).toBe(studentId.toString());
    expect(response.data.is_submitted).toBe(true);
  }, 10000);
  
  // Test getting submissions by assignment
  test('should get submissions by assignment', async () => {
    const response = await axios.get(`http://localhost:3000/api/assignments/${assignmentId}/submissions`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  }, 10000);
  
  // Test grading a submission
  test('should grade a submission', async () => {
    // First get the submission ID
    const submissionsResponse = await axios.get(`http://localhost:3000/api/assignments/${assignmentId}/submissions`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    const submissionId = submissionsResponse.data[0].id;
    
    const gradeData = {
      grade: 85,
      feedback: 'Good work!'
    };
    
    const response = await axios.post(`http://localhost:3000/api/assignments/submissions/${submissionId}/grade`, gradeData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.grade).toBe(85);
    expect(response.data.is_graded).toBe(true);
    expect(response.data.feedback).toBe('Good work!');
  }, 10000);
  
  // Test updating an assignment
  test('should update an assignment', async () => {
    const updateData = {
      title: 'Updated Test Assignment',
      description: 'This is an updated test assignment'
    };
    
    const response = await axios.put(`http://localhost:3000/api/assignments/${assignmentId}`, updateData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.title).toBe('Updated Test Assignment');
  }, 10000);
  
  // Test assignment analytics
  test('should get assignment analytics', async () => {
    const response = await axios.get(`http://localhost:3000/api/assignments/${assignmentId}/analytics`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.assignmentId.toString()).toBe(assignmentId.toString());
    expect(response.data.totalSubmissions).toBeGreaterThanOrEqual(1);
  }, 10000);
});