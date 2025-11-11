const Attendance = require('../models/Attendance');
const logger = require('../config/logger');

// Get all attendance records
const getAllAttendance = async (req, res) => {
  try {
    const { classId, subjectId, studentId, date, status, method } = req.query;
    
    // Build where clause for filtering
    let where = {};
    if (classId) where.class_id = classId;
    if (subjectId) where.subject_id = subjectId;
    if (studentId) where.student_id = studentId;
    if (date) where.date = new Date(date);
    if (status) where.status = status;
    if (method) where.method = method;
    
    const attendanceRecords = await Attendance.findAll({ where });
    
    res.json(attendanceRecords);
  } catch (error) {
    logger.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
};

// Get attendance record by ID
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendanceRecord = await Attendance.findByPk(id);
    
    if (!attendanceRecord) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    res.json(attendanceRecord);
  } catch (error) {
    logger.error('Error fetching attendance record:', error);
    res.status(500).json({ error: 'Failed to fetch attendance record' });
  }
};

// Create attendance record
const createAttendance = async (req, res) => {
  try {
    const attendanceData = {
      course_id: req.body.courseId,
      class_id: req.body.classId,
      subject_id: req.body.subjectId,
      teacher_id: req.body.teacherId,
      student_id: req.body.studentId,
      date: req.body.date,
      status: req.body.status,
      method: req.body.method,
      recorded_by: req.body.recordedBy,
      notes: req.body.notes
    };
    
    const attendanceRecord = await Attendance.create(attendanceData);
    
    // Broadcast real-time update (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.status(201).json(attendanceRecord);
  } catch (error) {
    logger.error('Error creating attendance record:', error);
    res.status(500).json({ error: 'Failed to create attendance record' });
  }
};

// Update attendance record
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendanceData = {
      course_id: req.body.courseId,
      class_id: req.body.classId,
      subject_id: req.body.subjectId,
      teacher_id: req.body.teacherId,
      student_id: req.body.studentId,
      date: req.body.date,
      status: req.body.status,
      method: req.body.method,
      recorded_by: req.body.recordedBy,
      notes: req.body.notes
    };
    
    // First, check if the attendance record exists
    const existingAttendance = await Attendance.findByPk(id);
    if (!existingAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Update the attendance record
    await Attendance.update(attendanceData, {
      where: { id }
    });
    
    // Fetch the updated record
    const updatedAttendance = await Attendance.findByPk(id);
    
    // Broadcast real-time update (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.json(updatedAttendance);
  } catch (error) {
    logger.error('Error updating attendance record:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
};

// Delete attendance record
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, check if the attendance record exists
    const existingAttendance = await Attendance.findByPk(id);
    if (!existingAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Delete the attendance record
    await Attendance.destroy({
      where: { id }
    });
    
    // Broadcast real-time update (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    logger.error('Error deleting attendance record:', error);
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
  try {
    const { classId, subjectId, startDate, endDate } = req.query;
    
    // Build where clause for filtering
    let where = {};
    if (classId) where.class_id = classId;
    if (subjectId) where.subject_id = subjectId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) where.date[require('sequelize').Op.lte] = new Date(endDate);
    }
    
    // Get all attendance records for the given criteria
    const attendanceRecords = await Attendance.findAll({ where });
    
    // Calculate statistics
    const stats = {
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
    const totalWithStatus = stats.present + stats.absent + stats.late;
    stats.attendanceRate = totalWithStatus > 0 ? Math.round((stats.present + stats.late) / totalWithStatus * 100) : 0;
    
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching attendance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
};

// Create bulk attendance records
const createBulkAttendance = async (req, res) => {
  try {
    const { attendanceRecords } = req.body;
    
    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      return res.status(400).json({ error: 'Invalid attendance records data' });
    }
    
    // Validate each attendance record
    for (const record of attendanceRecords) {
      if (!record.courseId || !record.classId || !record.subjectId || !record.teacherId || 
          !record.studentId || !record.date || !record.status) {
        return res.status(400).json({ 
          error: 'Missing required fields in attendance record', 
          record 
        });
      }
    }
    
    // Transform records to match model
    const transformedRecords = attendanceRecords.map(record => ({
      course_id: record.courseId,
      class_id: record.classId,
      subject_id: record.subjectId,
      teacher_id: record.teacherId,
      student_id: record.studentId,
      date: new Date(record.date),
      status: record.status,
      method: record.method || 'manual',
      recorded_by: record.recordedBy || req.user.id,
      notes: record.notes
    }));
    
    // Create all attendance records
    const createdRecords = await Attendance.bulkCreate(transformedRecords);
    
    // Broadcast real-time updates (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.status(201).json({
      message: 'Bulk attendance records created successfully',
      count: createdRecords.length,
      data: createdRecords
    });
  } catch (error) {
    logger.error('Error creating bulk attendance records:', error);
    res.status(500).json({ error: 'Failed to create bulk attendance records' });
  }
};

// Update bulk attendance status
const updateBulkAttendanceStatus = async (req, res) => {
  try {
    const { ids, status, notes } = req.body;
    
    if (!ids || !Array.isArray(ids) || !status) {
      return res.status(400).json({ error: 'Missing required fields: ids (array) and status' });
    }
    
    // Update all attendance records
    const [updatedCount] = await Attendance.update(
      { status, notes },
      { where: { id: ids } }
    );
    
    // Broadcast real-time updates (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.json({
      message: 'Bulk attendance status updated successfully',
      count: updatedCount
    });
  } catch (error) {
    logger.error('Error updating bulk attendance status:', error);
    res.status(500).json({ error: 'Failed to update bulk attendance status' });
  }
};

// Get student attendance summary
const getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, subjectId, startDate, endDate } = req.query;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Missing studentId parameter' });
    }
    
    // Build where clause for filtering
    let where = { student_id: studentId };
    if (classId) where.class_id = classId;
    if (subjectId) where.subject_id = subjectId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) where.date[require('sequelize').Op.lte] = new Date(endDate);
    }
    
    // Get all attendance records for the student
    const attendanceRecords = await Attendance.findAll({ where });
    
    // Calculate summary
    const summary = {
      studentId,
      classId: classId || null,
      subjectId: subjectId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      totalRecords: attendanceRecords.length,
      present: attendanceRecords.filter(record => record.status === 'present').length,
      absent: attendanceRecords.filter(record => record.status === 'absent').length,
      late: attendanceRecords.filter(record => record.status === 'late').length,
      excused: attendanceRecords.filter(record => record.status === 'excused').length
    };
    
    // Calculate attendance rate
    const totalWithStatus = summary.present + summary.absent + summary.late;
    summary.attendanceRate = totalWithStatus > 0 ? Math.round((summary.present + summary.late) / totalWithStatus * 100) : 0;
    
    res.json(summary);
  } catch (error) {
    logger.error('Error fetching student attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch student attendance summary' });
  }
};

// Get class attendance report
const getClassAttendanceReport = async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectId, startDate, endDate } = req.query;
    
    if (!classId) {
      return res.status(400).json({ error: 'Missing classId parameter' });
    }
    
    // Build where clause for filtering
    let where = { class_id: classId };
    if (subjectId) where.subject_id = subjectId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) where.date[require('sequelize').Op.lte] = new Date(endDate);
    }
    
    // Get all attendance records for the class
    const attendanceRecords = await Attendance.findAll({ where });
    
    // Group by student
    const recordsByStudent = {};
    attendanceRecords.forEach(record => {
      const studentId = record.student_id;
      if (!recordsByStudent[studentId]) {
        recordsByStudent[studentId] = [];
      }
      recordsByStudent[studentId].push(record);
    });
    
    // Calculate report data
    const reportData = Object.keys(recordsByStudent).map(studentId => {
      const records = recordsByStudent[studentId];
      const studentSummary = {
        studentId,
        totalRecords: records.length,
        present: records.filter(record => record.status === 'present').length,
        absent: records.filter(record => record.status === 'absent').length,
        late: records.filter(record => record.status === 'late').length,
        excused: records.filter(record => record.status === 'excused').length
      };
      
      // Calculate attendance rate
      const totalWithStatus = studentSummary.present + studentSummary.absent + studentSummary.late;
      studentSummary.attendanceRate = totalWithStatus > 0 ? 
        Math.round((studentSummary.present + studentSummary.late) / totalWithStatus * 100) : 0;
      
      return studentSummary;
    });
    
    res.json({
      classId,
      subjectId: subjectId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      totalStudents: reportData.length,
      data: reportData
    });
  } catch (error) {
    logger.error('Error generating class attendance report:', error);
    res.status(500).json({ error: 'Failed to generate class attendance report' });
  }
};

module.exports = {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  createBulkAttendance,
  updateBulkAttendanceStatus,
  getStudentAttendanceSummary,
  getClassAttendanceReport
};