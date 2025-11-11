const axios = require('axios');

async function debugStats() {
  try {
    // Register a new teacher
    const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Stats',
      lastName: 'Teacher',
      email: 'stats.teacher@example.com',
      password: 'password123',
      role: 'teacher'
    });
    
    const teacherToken = teacherRegisterResponse.data.token;
    console.log('Teacher registered successfully');
    
    // Try to get statistics without any attendance records
    try {
      const statsResponse = await axios.get('http://localhost:3000/api/attendance/stats?classId=101', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      console.log('Statistics (no records):', statsResponse.data);
    } catch (statsError) {
      console.log('Statistics error (no records):', statsError.response?.data || statsError.message);
    }
    
    // Register a new student
    const studentRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Stats',
      lastName: 'Student',
      email: 'stats.student@example.com',
      password: 'password123',
      role: 'student'
    });
    
    const studentToken = studentRegisterResponse.data.token;
    const studentId = studentRegisterResponse.data.user.id.toString();
    console.log('Student registered successfully');
    
    // Create an attendance record
    const attendanceResponse = await axios.post('http://localhost:3000/api/attendance', {
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
    
    console.log('Attendance record created:', attendanceResponse.data);
    
    // Try to get statistics with attendance records
    try {
      const statsResponse = await axios.get('http://localhost:3000/api/attendance/stats?classId=101', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      console.log('Statistics (with records):', statsResponse.data);
    } catch (statsError) {
      console.log('Statistics error (with records):', statsError.response?.data || statsError.message);
    }
    
  } catch (error) {
    console.error('Debug error:', error.response?.data || error.message);
  }
}

debugStats();