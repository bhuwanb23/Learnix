const axios = require('axios');

async function debugAttendance() {
  try {
    // Register a new teacher
    const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Debug',
      lastName: 'Teacher',
      email: 'debug.teacher@example.com',
      password: 'password123',
      role: 'teacher'
    });
    
    const teacherToken = teacherRegisterResponse.data.token;
    console.log('Teacher registered successfully');
    
    // Register a new student
    const studentRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Debug',
      lastName: 'Student',
      email: 'debug.student@example.com',
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
    
    // Get all attendance records
    const allAttendanceResponse = await axios.get('http://localhost:3000/api/attendance', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log('All attendance records:', allAttendanceResponse.data);
    
    // Try to get statistics
    try {
      const statsResponse = await axios.get('http://localhost:3000/api/attendance/stats?classId=101', {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      
      console.log('Statistics:', statsResponse.data);
    } catch (statsError) {
      console.log('Statistics error:', statsError.response?.data || statsError.message);
    }
    
  } catch (error) {
    console.error('Debug error:', error.response?.data || error.message);
  }
}

debugAttendance();