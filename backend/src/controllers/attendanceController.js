const Attendance = require('../models/Attendance');
const logger = require('../config/logger');
const { realTimeService } = require('../../server');

// Get all attendance records
const getAllAttendance = async (req, res) => {
  try {
    const { courseId, classId, subjectId, studentId, date } = req.query;
    let filter = {};
    
    if (courseId) filter.courseId = courseId;
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (studentId) filter.studentId = studentId;
    if (date) filter.date = new Date(date);
    
    const attendance = await Attendance.find(filter)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('teacherId')
      .populate('studentId')
      .populate('recordedBy')
      .sort({ date: -1 });
    
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
    const attendance = await Attendance.findById(id)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('teacherId')
      .populate('studentId')
      .populate('recordedBy');
    
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
    const attendanceData = req.body;
    const attendance = new Attendance(attendanceData);
    await attendance.save();
    
    // Populate references
    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('teacherId')
      .populate('studentId')
      .populate('recordedBy');
    
    // Broadcast real-time update
    realTimeService.broadcastAttendanceUpdate({
      action: 'created',
      data: populatedAttendance
    });
    
    res.status(201).json(populatedAttendance);
  } catch (error) {
    logger.error('Error creating attendance record:', error);
    res.status(500).json({ error: 'Failed to create attendance record' });
  }
};

// Update attendance record
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendanceData = req.body;
    
    const attendance = await Attendance.findByIdAndUpdate(
      id,
      attendanceData,
      { new: true, runValidators: true }
    );
    
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Populate references
    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('teacherId')
      .populate('studentId')
      .populate('recordedBy');
    
    // Broadcast real-time update
    realTimeService.broadcastAttendanceUpdate({
      action: 'updated',
      data: populatedAttendance
    });
    
    res.json(populatedAttendance);
  } catch (error) {
    logger.error('Error updating attendance record:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
};

// Delete attendance record
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findByIdAndDelete(id);
    
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
    let match = {};
    
    if (classId) match.classId = classId;
    if (subjectId) match.subjectId = subjectId;
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
    
    const stats = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$studentId',
          totalClasses: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalClasses: 1,
          present: 1,
          absent: 1,
          late: 1,
          attendanceRate: {
            $multiply: [
              { $divide: ['$present', '$totalClasses'] },
              100
            ]
          }
        }
      }
    ]);
    
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