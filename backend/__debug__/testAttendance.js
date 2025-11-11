const axios = require('axios');

async function testAttendanceFunctionality() {
  try {
    console.log('Testing Attendance Functionality...\n');
    
    // 1. Register a new user (teacher)
    console.log('1. Registering teacher user...');
    const teacherRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'John',
      lastName: 'Teacher',
      email: 'john.teacher4@example.com',
      password: 'password123',
      role: 'teacher'
    });
    
    console.log('✅ Teacher registration successful');
    const teacherToken = teacherRegisterResponse.data.token;
    
    // 2. Register a student user
    console.log('2. Registering student user...');
    const studentRegisterResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'Jane',
      lastName: 'Student',
      email: 'jane.student4@example.com',
      password: 'password123',
      role: 'student'
    });
    
    console.log('✅ Student registration successful');
    const studentToken = studentRegisterResponse.data.token;
    const studentId = studentRegisterResponse.data.user.id.toString();
    
    // 3. Create attendance record (manual entry by teacher)
    console.log('3. Creating manual attendance record...');
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
    
    console.log('✅ Manual attendance record created');
    const attendanceId = attendanceResponse.data.id;
    
    // 4. Get attendance records
    console.log('4. Getting attendance records...');
    const getAttendanceResponse = await axios.get(`http://localhost:3000/api/attendance?classId=101`, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log(`✅ Retrieved ${getAttendanceResponse.data.length} attendance records`);
    
    // 5. Update attendance record
    console.log('5. Updating attendance record...');
    await axios.put(`http://localhost:3000/api/attendance/${attendanceId}`, {
      courseId: "1",
      classId: "101",
      subjectId: "1",
      teacherId: "1",
      studentId: studentId,
      date: "2023-11-15",
      status: "late",
      method: "manual",
      recordedBy: "1",
      notes: "Arrived 10 minutes late"
    }, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log('✅ Attendance record updated');
    
    // 6. Bulk attendance entry
    console.log('6. Creating bulk attendance records...');
    await axios.post('http://localhost:3000/api/attendance/bulk', {
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
    
    console.log('✅ Bulk attendance records created');
    
    // 7. Get attendance statistics
    console.log('7. Getting attendance statistics...');
    const statsResponse = await axios.get('http://localhost:3000/api/attendance/stats?classId=101', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log('✅ Attendance statistics retrieved');
    console.log(`   Total records: ${statsResponse.data.totalRecords}`);
    console.log(`   Attendance rate: ${statsResponse.data.attendanceRate}%`);
    
    // 8. Generate QR code for attendance
    console.log('8. Generating QR code for attendance...');
    const qrResponse = await axios.post('http://localhost:3000/api/attendance-automation/qr/generate', {
      classId: "101",
      subjectId: "1",
      date: "2023-11-17",
      teacherId: "1"
    }, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log('✅ QR code generated');
    const qrData = qrResponse.data.qrData;
    
    // 9. Record attendance via QR code
    console.log('9. Recording attendance via QR code...');
    await axios.post('http://localhost:3000/api/attendance-automation/qr/record', {
      qrData: qrData,
      studentId: studentId,
      classId: "101",
      subjectId: "1",
      date: "2023-11-17"
    }, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });
    
    console.log('✅ Attendance recorded via QR code');
    
    // 10. Get attendance summary
    console.log('10. Getting attendance summary...');
    const summaryResponse = await axios.get('http://localhost:3000/api/attendance-analytics/summary?classId=101', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log('✅ Attendance summary retrieved');
    console.log(`   Total students: ${summaryResponse.data.totalStudents}`);
    console.log(`   Attendance rate: ${summaryResponse.data.attendanceRate}%`);
    
    // 11. Get fraud alerts
    console.log('11. Checking for fraud alerts...');
    const fraudResponse = await axios.get('http://localhost:3000/api/attendance-fraud/alerts?classId=101&subjectId=1&date=2023-11-15', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log('✅ Fraud alerts checked');
    console.log(`   Found ${fraudResponse.data.fraudAlerts.length} fraud alerts`);
    
    // 12. Send low attendance alert
    console.log('12. Sending low attendance alert...');
    await axios.post('http://localhost:3000/api/notifications/low-attendance-alert', {
      studentId: studentId,
      parentId: "parent1",
      attendanceRate: 60,
      classId: "101"
    }, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log('✅ Low attendance alert sent');
    
    // 13. Get user notifications
    console.log('13. Getting user notifications...');
    const notificationsResponse = await axios.get('http://localhost:3000/api/notifications', {
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      }
    });
    
    console.log(`✅ Retrieved ${notificationsResponse.data.notifications.length} notifications`);
    
    console.log('\n🎉 All attendance functionality tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAttendanceFunctionality();