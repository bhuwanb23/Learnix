const axios = require('axios');
const { sequelize } = require('../src/config/db');
const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');

// Test suite for attendance functionality
describe('Attendance API', () => {
  let teacherToken, studentToken, studentId;
  let server;

  // Start server before running tests
  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
    // Register teacher
    const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Test',
      lastName: 'Teacher',
      email: 'test.teacher@example.com',
      password: 'password123',
      role: 'teacher'
    });
    teacherToken = teacherRegisterResponse.data.token;
    
    // Register student
    const studentRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Test',
      lastName: 'Student',
      email: 'test.student@example.com',
      password: 'password123',
      role: 'student'
    });
    studentToken = studentRegisterResponse.data.token;
    studentId = studentRegisterResponse.data.user.id.toString();
  });

  // Close database connections after tests
  afterAll(async () => {
    await sequelize.close();
  });

  // Test manual attendance creation
  test('should create manual attendance record', async () => {
    const response = await axios.post('http://localhost:3000/api/attendance', {
      courseId: "1",
      classId: "101",
      subjectId: "1",
      teacherId: "1",
      studentId: studentId,
      date: "2023-11-15",
      status: "present",
      method: "manual",
      recordedBy: "1",
      notes: "Good participation"
    }, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data.status).toBe('present');
  });

  // Test getting attendance records
  test('should get attendance records', async () => {
    const response = await axios.get('http://localhost:3000/api/attendance?classId=101', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  });

  // Test attendance statistics
  test('should get attendance statistics', async () => {
    const response = await axios.get('http://localhost:3000/api/attendance/stats?classId=101', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('totalRecords');
    expect(response.data).toHaveProperty('present');
    expect(response.data).toHaveProperty('absent');
    expect(response.data).toHaveProperty('attendanceRate');
  });

  // Test bulk attendance creation
  test('should create bulk attendance records', async () => {
    const response = await axios.post('http://localhost:3000/api/attendance/bulk', {
      attendanceRecords: [
        {
          courseId: "1",
          classId: "101",
          subjectId: "1",
          teacherId: "1",
          studentId: studentId,
          date: "2023-11-16",
          status: "present",
          notes: "On time"
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    expect(response.status).toBe(201);
    expect(response.data.count).toBe(1);
  });

  // Test QR code generation
  test('should generate QR code for attendance', async () => {
    const response = await axios.post('http://localhost:3000/api/attendance-automation/qr/generate', {
      classId: "101",
      subjectId: "1",
      date: "2023-11-17",
      teacherId: "1"
    }, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('qrCodeDataUrl');
    expect(response.data).toHaveProperty('qrData');
  });

  // Test attendance analytics
  test('should get attendance analytics', async () => {
    const response = await axios.get('http://localhost:3000/api/attendance-analytics?classId=101', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('summary');
    expect(response.data).toHaveProperty('trends');
  });

  // Test fraud detection
  test('should check for fraud alerts', async () => {
    const response = await axios.get('http://localhost:3000/api/attendance-fraud/alerts?classId=101&subjectId=1&date=2023-11-15', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('fraudAlerts');
  });

  // Test notifications
  test('should send low attendance alert', async () => {
    const response = await axios.post('http://localhost:3000/api/notifications/low-attendance-alert', {
      studentId: studentId,
      parentId: "parent1",
      attendanceRate: 60,
      classId: "101"
    }, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success');
  });
});