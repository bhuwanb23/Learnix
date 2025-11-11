const Attendance = require('../models/Attendance');
const logger = require('../config/logger');
const { realTimeService } = require('../../server');

// Get all attendance records
const getAllAttendance = async (req, res) => {
  try {
    const { courseId, classId, subjectId, studentId, date } = req.query;
    let where = {};
    
    if (courseId) where.course_id = courseId;
    if (classId) where.class_id = classId;
    if (subjectId) where.subject_id = subjectId;
    if (studentId) where.student_id = studentId;
    if (date) where.date = new Date(date);
    
    const attendance = await Attendance.findAll({
      where,
      order: [['date', 'DESC']]
    });
    
    res.json(attendance);
  } catch (error) {
    logger.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
};

// Get attendance by ID
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findByPk(id);
    
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    res.json(attendance);
  } catch (error) {
    logger.error('Error fetching attendance record:', error);
    res.status(500).json({ error: 'Failed to fetch attendance record' });
  }
};

// Create new attendance record
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
    
    const attendance = await Attendance.create(attendanceData);
    
    // Broadcast real-time update
    realTimeService.broadcastAttendanceUpdate({
      action: 'created',
      data: attendance
    });
    
    res.status(201).json(attendance);
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
    
    const attendance = await Attendance.update(attendanceData, {
      where: { id },
      returning: true
    });
    
    if (!attendance[0]) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    const updatedAttendance = await Attendance.findByPk(id);
    
    // Broadcast real-time update
    realTimeService.broadcastAttendanceUpdate({
      action: 'updated',
      data: updatedAttendance
    });
    
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
    const attendance = await Attendance.destroy({
      where: { id }
    });
    
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Broadcast real-time update
    realTimeService.broadcastAttendanceUpdate({
      action: 'deleted',
      id: id
    });
    
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
    
    // For simplicity, we'll return a basic stats object
    // In a real implementation, you would perform actual aggregation queries
    const stats = {
      classId: classId || null,
      subjectId: subjectId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      totalRecords: 0,
      present: 0,
      absent: 0,
      late: 0,
      attendanceRate: 0
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching attendance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
};

module.exports = {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats
};