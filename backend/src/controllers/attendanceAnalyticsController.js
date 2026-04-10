const Attendance = require('../models/Attendance');
const logger = require('../config/logger');

// Get detailed attendance analytics
const getAttendanceAnalytics = async (req, res) => {
  try {
    const { classId, subjectId, studentId, startDate, endDate } = req.query;
    
    // Build where clause for filtering
    let where = {};
    if (classId) where.class_id = classId;
    if (subjectId) where.subject_id = subjectId;
    if (studentId) where.student_id = studentId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) where.date[require('sequelize').Op.lte] = new Date(endDate);
    }
    
    // Get all attendance records for the given criteria
    const attendanceRecords = await Attendance.findAll({ where });
    
    // Calculate detailed statistics
    const analytics = {
      totalRecords: attendanceRecords.length,
      present: attendanceRecords.filter(record => record.status === 'present').length,
      absent: attendanceRecords.filter(record => record.status === 'absent').length,
      late: attendanceRecords.filter(record => record.status === 'late').length,
      excused: attendanceRecords.filter(record => record.status === 'excused').length,
      byMethod: {
        manual: attendanceRecords.filter(record => record.method === 'manual').length,
        qr: attendanceRecords.filter(record => record.method === 'qr').length,
        nfc: attendanceRecords.filter(record => record.method === 'nfc').length,
        face_recognition: attendanceRecords.filter(record => record.method === 'face_recognition').length
      }
    };
    
    // Calculate attendance rate
    const totalWithStatus = analytics.present + analytics.absent + analytics.late;
    analytics.attendanceRate = totalWithStatus > 0 ? Math.round((analytics.present + analytics.late) / totalWithStatus * 100) : 0;
    
    // Calculate trend data (daily attendance rate for the last 30 days)
    const trendData = calculateTrendData(attendanceRecords);
    
    // Calculate student performance data if filtering by class
    let studentPerformance = null;
    if (classId) {
      studentPerformance = calculateStudentPerformance(attendanceRecords);
    }
    
    res.json({
      filters: {
        classId: classId || null,
        subjectId: subjectId || null,
        studentId: studentId || null,
        startDate: startDate || null,
        endDate: endDate || null
      },
      summary: analytics,
      trends: trendData,
      studentPerformance
    });
  } catch (error) {
    logger.error('Error fetching attendance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch attendance analytics' });
  }
};

// Calculate trend data for attendance
const calculateTrendData = (attendanceRecords) => {
  // Group records by date
  const recordsByDate = {};
  attendanceRecords.forEach(record => {
    const dateKey = record.date.toISOString().split('T')[0];
    if (!recordsByDate[dateKey]) {
      recordsByDate[dateKey] = {
        present: 0,
        absent: 0,
        late: 0,
        total: 0
      };
    }
    
    recordsByDate[dateKey].total++;
    if (record.status === 'present') recordsByDate[dateKey].present++;
    if (record.status === 'absent') recordsByDate[dateKey].absent++;
    if (record.status === 'late') recordsByDate[dateKey].late++;
  });
  
  // Convert to trend data array
  const trendData = Object.keys(recordsByDate).map(date => {
    const data = recordsByDate[date];
    const rate = data.total > 0 ? Math.round((data.present + data.late) / data.total * 100) : 0;
    
    return {
      date,
      attendanceRate: rate,
      present: data.present,
      absent: data.absent,
      late: data.late,
      total: data.total
    };
  });
  
  // Sort by date
  return trendData.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Calculate student performance data
const calculateStudentPerformance = (attendanceRecords) => {
  // Group records by student
  const recordsByStudent = {};
  attendanceRecords.forEach(record => {
    const studentId = record.student_id;
    if (!recordsByStudent[studentId]) {
      recordsByStudent[studentId] = {
        present: 0,
        absent: 0,
        late: 0,
        total: 0
      };
    }
    
    recordsByStudent[studentId].total++;
    if (record.status === 'present') recordsByStudent[studentId].present++;
    if (record.status === 'absent') recordsByStudent[studentId].absent++;
    if (record.status === 'late') recordsByStudent[studentId].late++;
  });
  
  // Convert to performance data array
  const performanceData = Object.keys(recordsByStudent).map(studentId => {
    const data = recordsByStudent[studentId];
    const rate = data.total > 0 ? Math.round((data.present + data.late) / data.total * 100) : 0;
    
    return {
      studentId,
      attendanceRate: rate,
      present: data.present,
      absent: data.absent,
      late: data.late,
      total: data.total
    };
  });
  
  // Sort by attendance rate (descending)
  return performanceData.sort((a, b) => b.attendanceRate - a.attendanceRate);
};

// Get attendance comparison report
const getAttendanceComparison = async (req, res) => {
  try {
    const { classId, subjectIds, startDate, endDate } = req.query;
    
    if (!classId || !subjectIds) {
      return res.status(400).json({ error: 'Missing required fields: classId, subjectIds' });
    }
    
    // Parse subjectIds (could be comma-separated string or array)
    const subjects = Array.isArray(subjectIds) ? subjectIds : subjectIds.split(',');
    
    // Get attendance data for each subject
    const subjectData = [];
    for (const subjectId of subjects) {
      const where = {
        class_id: classId,
        subject_id: subjectId
      };
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date[require('sequelize').Op.gte] = new Date(startDate);
        if (endDate) where.date[require('sequelize').Op.lte] = new Date(endDate);
      }
      
      const records = await Attendance.findAll({ where });
      
      const stats = {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length
      };
      
      const rate = stats.total > 0 ? Math.round((stats.present + stats.late) / stats.total * 100) : 0;
      
      subjectData.push({
        subjectId,
        stats: {
          ...stats,
          attendanceRate: rate
        }
      });
    }
    
    res.json({
      classId,
      subjects: subjectData
    });
  } catch (error) {
    logger.error('Error fetching attendance comparison:', error);
    res.status(500).json({ error: 'Failed to fetch attendance comparison' });
  }
};

// Get low attendance alerts
const getLowAttendanceAlerts = async (req, res) => {
  try {
    const { classId, threshold = 75 } = req.query;
    
    // Get all students in the class (simplified - in a real app, you'd query a Student model)
    // For now, we'll get unique student IDs from attendance records
    const where = classId ? { class_id: classId } : {};
    const allRecords = await Attendance.findAll({ where });
    
    // Group by student
    const studentRecords = {};
    allRecords.forEach(record => {
      const studentId = record.student_id;
      if (!studentRecords[studentId]) {
        studentRecords[studentId] = {
          present: 0,
          absent: 0,
          late: 0,
          total: 0
        };
      }
      
      studentRecords[studentId].total++;
      if (record.status === 'present') studentRecords[studentId].present++;
      if (record.status === 'absent') studentRecords[studentId].absent++;
      if (record.status === 'late') studentRecords[studentId].late++;
    });
    
    // Find students with low attendance
    const lowAttendanceStudents = Object.keys(studentRecords)
      .map(studentId => {
        const data = studentRecords[studentId];
        const rate = data.total > 0 ? Math.round((data.present + data.late) / data.total * 100) : 0;
        
        return {
          studentId,
          attendanceRate: rate,
          present: data.present,
          absent: data.absent,
          late: data.late,
          total: data.total
        };
      })
      .filter(student => student.attendanceRate < parseInt(threshold))
      .sort((a, b) => a.attendanceRate - b.attendanceRate);
    
    res.json({
      threshold: parseInt(threshold),
      lowAttendanceStudents
    });
  } catch (error) {
    logger.error('Error fetching low attendance alerts:', error);
    res.status(500).json({ error: 'Failed to fetch low attendance alerts' });
  }
};

// Get comprehensive attendance summary
const getAttendanceSummary = async (req, res) => {
  try {
    const { classId, subjectId, startDate, endDate } = req.query;
    
    // Validate required fields
    if (!classId) {
      return res.status(400).json({ error: 'Missing required field: classId' });
    }
    
    // Build where clause for filtering
    let where = { class_id: classId };
    if (subjectId) where.subject_id = subjectId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) where.date[require('sequelize').Op.lte] = new Date(endDate);
    }
    
    // Get all attendance records for the given criteria
    const attendanceRecords = await Attendance.findAll({ where });
    
    // Calculate summary statistics
    const summary = {
      classId,
      subjectId: subjectId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      totalStudents: new Set(attendanceRecords.map(r => r.student_id)).size,
      totalSessions: new Set(attendanceRecords.map(r => r.date.toISOString().split('T')[0])).size,
      totalRecords: attendanceRecords.length,
      present: attendanceRecords.filter(record => record.status === 'present').length,
      absent: attendanceRecords.filter(record => record.status === 'absent').length,
      late: attendanceRecords.filter(record => record.status === 'late').length,
      excused: attendanceRecords.filter(record => record.status === 'excused').length,
      byMethod: {
        manual: attendanceRecords.filter(record => record.method === 'manual').length,
        qr: attendanceRecords.filter(record => record.method === 'qr').length,
        nfc: attendanceRecords.filter(record => record.method === 'nfc').length,
        face_recognition: attendanceRecords.filter(record => record.method === 'face_recognition').length
      }
    };
    
    // Calculate attendance rate
    const totalWithStatus = summary.present + summary.absent + summary.late;
    summary.attendanceRate = totalWithStatus > 0 ? Math.round((summary.present + summary.late) / totalWithStatus * 100) : 0;
    
    // Calculate daily averages
    const uniqueDates = [...new Set(attendanceRecords.map(r => r.date.toISOString().split('T')[0]))];
    summary.averageDailyAttendance = uniqueDates.length > 0 ? Math.round(summary.totalRecords / uniqueDates.length) : 0;
    
    // Get top performing students
    const studentPerformance = calculateStudentPerformance(attendanceRecords);
    summary.topPerformingStudents = studentPerformance.slice(0, 5);
    summary.lowPerformingStudents = studentPerformance.slice(-5).reverse();
    
    res.json(summary);
  } catch (error) {
    logger.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
};

// Export attendance data
const exportAttendanceData = async (req, res) => {
  try {
    const { classId, subjectId, startDate, endDate, format = 'json' } = req.query;
    
    // Validate required fields
    if (!classId) {
      return res.status(400).json({ error: 'Missing required field: classId' });
    }
    
    // Build where clause for filtering
    let where = { class_id: classId };
    if (subjectId) where.subject_id = subjectId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) where.date[require('sequelize').Op.lte] = new Date(endDate);
    }
    
    // Get all attendance records for the given criteria
    const attendanceRecords = await Attendance.findAll({ where });
    
    // Format data based on requested format
    if (format === 'csv') {
      // Create CSV content
      const headers = ['Date', 'Student ID', 'Status', 'Method', 'Recorded By', 'Notes'];
      const csvRows = attendanceRecords.map(record => [
        record.date.toISOString().split('T')[0],
        record.student_id,
        record.status,
        record.method,
        record.recorded_by,
        record.notes || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-${classId}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } else {
      // Default to JSON format
      res.json({
        classId,
        subjectId: subjectId || null,
        startDate: startDate || null,
        endDate: endDate || null,
        totalRecords: attendanceRecords.length,
        data: attendanceRecords.map(record => ({
          id: record.id,
          date: record.date,
          studentId: record.student_id,
          status: record.status,
          method: record.method,
          recordedBy: record.recorded_by,
          notes: record.notes
        }))
      });
    }
  } catch (error) {
    logger.error('Error exporting attendance data:', error);
    res.status(500).json({ error: 'Failed to export attendance data' });
  }
};

module.exports = {
  getAttendanceAnalytics,
  getAttendanceComparison,
  getLowAttendanceAlerts,
  getAttendanceSummary,
  exportAttendanceData
};