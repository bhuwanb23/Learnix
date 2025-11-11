const { 
  detectAttendanceFraud, 
  getFraudRiskScore,
  detectDuplicateAttendance
} = require('../services/attendanceFraudDetectionService');
const Attendance = require('../models/Attendance');
const logger = require('../config/logger');

// Get fraud alerts for a specific class session
const getFraudAlerts = async (req, res) => {
  try {
    const { classId, subjectId, date } = req.query;
    
    // Validate required fields
    if (!classId || !subjectId || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['classId', 'subjectId', 'date'] 
      });
    }
    
    // Get attendance records for this session
    const attendanceRecords = await Attendance.findAll({
      where: {
        class_id: classId,
        subject_id: subjectId,
        date: new Date(date)
      }
    });
    
    // Detect fraud
    const fraudAlerts = await detectAttendanceFraud(classId, subjectId, date, attendanceRecords);
    
    res.json({
      classId,
      subjectId,
      date,
      totalRecords: attendanceRecords.length,
      fraudAlerts
    });
  } catch (error) {
    logger.error('Error fetching fraud alerts:', error);
    res.status(500).json({ error: 'Failed to fetch fraud alerts' });
  }
};

// Get fraud risk score for a specific student
const getStudentFraudRisk = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Missing studentId parameter' });
    }
    
    const riskScore = await getFraudRiskScore(studentId);
    
    res.json(riskScore);
  } catch (error) {
    logger.error('Error fetching student fraud risk:', error);
    res.status(500).json({ error: 'Failed to fetch student fraud risk' });
  }
};

// Get all students with high fraud risk
const getHighRiskStudents = async (req, res) => {
  try {
    const { classId, threshold = 30 } = req.query;
    
    // Get all students in the class (simplified)
    const where = classId ? { class_id: classId } : {};
    const allRecords = await Attendance.findAll({ where });
    
    // Get unique student IDs
    const studentIds = [...new Set(allRecords.map(record => record.student_id))];
    
    // Calculate risk scores for all students
    const riskScores = [];
    for (const studentId of studentIds) {
      try {
        const riskScore = await getFraudRiskScore(studentId);
        if (riskScore.riskScore >= parseInt(threshold)) {
          riskScores.push(riskScore);
        }
      } catch (error) {
        logger.warn(`Error calculating risk score for student ${studentId}:`, error);
      }
    }
    
    // Sort by risk score (descending)
    riskScores.sort((a, b) => b.riskScore - a.riskScore);
    
    res.json({
      threshold: parseInt(threshold),
      highRiskStudents: riskScores
    });
  } catch (error) {
    logger.error('Error fetching high risk students:', error);
    res.status(500).json({ error: 'Failed to fetch high risk students' });
  }
};

// Detect duplicate attendance records
const getDuplicateAttendance = async (req, res) => {
  try {
    const { classId, subjectId, date } = req.query;
    
    // Validate required fields
    if (!classId || !subjectId || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['classId', 'subjectId', 'date'] 
      });
    }
    
    const duplicates = await detectDuplicateAttendance(classId, subjectId, date);
    
    res.json({
      classId,
      subjectId,
      date,
      duplicates
    });
  } catch (error) {
    logger.error('Error detecting duplicate attendance:', error);
    res.status(500).json({ error: 'Failed to detect duplicate attendance' });
  }
};

module.exports = {
  getFraudAlerts,
  getStudentFraudRisk,
  getHighRiskStudents,
  getDuplicateAttendance
};