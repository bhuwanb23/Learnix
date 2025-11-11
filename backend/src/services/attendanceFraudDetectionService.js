const Attendance = require('../models/Attendance');
const logger = require('../config/logger');

// Detect duplicate attendance records
const detectDuplicateAttendance = async (classId, subjectId, date) => {
  try {
    // Find attendance records for the same class, subject, and date
    const records = await Attendance.findAll({
      where: {
        class_id: classId,
        subject_id: subjectId,
        date: new Date(date)
      }
    });
    
    // Group by student
    const recordsByStudent = {};
    records.forEach(record => {
      const studentId = record.student_id;
      if (!recordsByStudent[studentId]) {
        recordsByStudent[studentId] = [];
      }
      recordsByStudent[studentId].push(record);
    });
    
    // Find students with multiple records
    const duplicates = [];
    Object.keys(recordsByStudent).forEach(studentId => {
      if (recordsByStudent[studentId].length > 1) {
        duplicates.push({
          studentId,
          records: recordsByStudent[studentId],
          count: recordsByStudent[studentId].length
        });
      }
    });
    
    return duplicates;
  } catch (error) {
    logger.error('Error detecting duplicate attendance:', error);
    throw error;
  }
};

// Detect suspicious timing patterns
const detectSuspiciousTiming = async (studentId, classId, subjectId, date) => {
  try {
    // Get recent attendance records for this student in similar classes
    const recentRecords = await Attendance.findAll({
      where: {
        student_id: studentId,
        class_id: classId,
        subject_id: subjectId
      },
      order: [['date', 'DESC']],
      limit: 10
    });
    
    // Check for suspicious patterns
    const suspiciousPatterns = [];
    
    // Check for attendance at unusual times (if we had timestamp data)
    // This would require more detailed timing data than we currently store
    
    // Check for attendance from multiple locations/IPs (simplified)
    // In a real implementation, you would track IP addresses or device fingerprints
    
    return suspiciousPatterns;
  } catch (error) {
    logger.error('Error detecting suspicious timing:', error);
    throw error;
  }
};

// Detect bulk attendance anomalies
const detectBulkAttendanceAnomalies = async (attendanceRecords) => {
  try {
    // Check if all records have the same timestamp (suspicious)
    // Check if all records have the same recorded_by user (suspicious for large batches)
    // Check if attendance rate is unusually high (100% attendance might be suspicious)
    
    const anomalies = [];
    
    // Check for 100% attendance rate
    const totalRecords = attendanceRecords.length;
    const presentRecords = attendanceRecords.filter(record => 
      record.status === 'present' || record.status === 'late'
    ).length;
    
    const attendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;
    
    if (attendanceRate === 100 && totalRecords > 10) {
      anomalies.push({
        type: 'perfect_attendance',
        message: 'Unusually high attendance rate (100%) for large class',
        recordsAffected: totalRecords
      });
    }
    
    // Check if all records were recorded by the same person
    const recorders = [...new Set(attendanceRecords.map(record => record.recorded_by))];
    if (recorders.length === 1 && totalRecords > 5) {
      anomalies.push({
        type: 'single_recorder',
        message: 'All records recorded by single user - possible bulk entry',
        recorder: recorders[0],
        recordsAffected: totalRecords
      });
    }
    
    return anomalies;
  } catch (error) {
    logger.error('Error detecting bulk attendance anomalies:', error);
    throw error;
  }
};

// Detect geographic anomalies (simplified)
const detectGeographicAnomalies = async (studentId, classId, date) => {
  try {
    // In a real implementation, you would:
    // 1. Track GPS coordinates or IP geolocation
    // 2. Compare with student's usual location
    // 3. Check against class location
    
    // For now, we'll return an empty array as this requires additional data
    return [];
  } catch (error) {
    logger.error('Error detecting geographic anomalies:', error);
    throw error;
  }
};

// Main fraud detection function
const detectAttendanceFraud = async (classId, subjectId, date, attendanceRecords = null) => {
  try {
    // Get attendance records if not provided
    if (!attendanceRecords) {
      attendanceRecords = await Attendance.findAll({
        where: {
          class_id: classId,
          subject_id: subjectId,
          date: new Date(date)
        }
      });
    }
    
    // Run all detection algorithms
    const duplicates = await detectDuplicateAttendance(classId, subjectId, date);
    const bulkAnomalies = await detectBulkAttendanceAnomalies(attendanceRecords);
    
    // For each student, check for suspicious timing
    const timingAnomalies = [];
    const uniqueStudents = [...new Set(attendanceRecords.map(record => record.student_id))];
    
    for (const studentId of uniqueStudents) {
      const studentAnomalies = await detectSuspiciousTiming(studentId, classId, subjectId, date);
      if (studentAnomalies.length > 0) {
        timingAnomalies.push({
          studentId,
          anomalies: studentAnomalies
        });
      }
    }
    
    // Compile all fraud alerts
    const fraudAlerts = [];
    
    // Add duplicate attendance alerts
    duplicates.forEach(duplicate => {
      fraudAlerts.push({
        type: 'duplicate_attendance',
        severity: 'high',
        message: `Student ${duplicate.studentId} has ${duplicate.count} attendance records for the same session`,
        details: duplicate
      });
    });
    
    // Add bulk anomaly alerts
    bulkAnomalies.forEach(anomaly => {
      fraudAlerts.push({
        type: 'bulk_anomaly',
        severity: 'medium',
        message: anomaly.message,
        details: anomaly
      });
    });
    
    // Add timing anomaly alerts
    timingAnomalies.forEach(anomaly => {
      fraudAlerts.push({
        type: 'timing_anomaly',
        severity: 'low',
        message: `Suspicious timing pattern detected for student ${anomaly.studentId}`,
        details: anomaly
      });
    });
    
    return fraudAlerts;
  } catch (error) {
    logger.error('Error detecting attendance fraud:', error);
    throw error;
  }
};

// Get fraud risk score for a student
const getFraudRiskScore = async (studentId) => {
  try {
    // Get recent attendance records for this student
    const recentRecords = await Attendance.findAll({
      where: {
        student_id: studentId
      },
      order: [['date', 'DESC']],
      limit: 50
    });
    
    // Calculate risk factors
    let riskScore = 0;
    const riskFactors = [];
    
    // Check for duplicate records
    const recordsBySession = {};
    recentRecords.forEach(record => {
      const sessionKey = `${record.class_id}-${record.subject_id}-${record.date.toISOString().split('T')[0]}`;
      if (!recordsBySession[sessionKey]) {
        recordsBySession[sessionKey] = 0;
      }
      recordsBySession[sessionKey]++;
    });
    
    const duplicateSessions = Object.values(recordsBySession).filter(count => count > 1).length;
    if (duplicateSessions > 0) {
      riskScore += duplicateSessions * 10;
      riskFactors.push({
        factor: 'duplicate_records',
        count: duplicateSessions,
        points: duplicateSessions * 10
      });
    }
    
    // Check for unusual attendance patterns (e.g., always present)
    const totalRecords = recentRecords.length;
    const presentRecords = recentRecords.filter(record => 
      record.status === 'present' || record.status === 'late'
    ).length;
    
    if (totalRecords > 0) {
      const attendanceRate = (presentRecords / totalRecords) * 100;
      if (attendanceRate === 100 && totalRecords > 10) {
        riskScore += 15;
        riskFactors.push({
          factor: 'perfect_attendance',
          rate: attendanceRate,
          points: 15
        });
      }
    }
    
    return {
      studentId,
      riskScore,
      riskLevel: riskScore < 20 ? 'low' : riskScore < 50 ? 'medium' : 'high',
      riskFactors
    };
  } catch (error) {
    logger.error('Error calculating fraud risk score:', error);
    throw error;
  }
};

module.exports = {
  detectAttendanceFraud,
  getFraudRiskScore,
  detectDuplicateAttendance,
  detectSuspiciousTiming,
  detectBulkAttendanceAnomalies,
  detectGeographicAnomalies
};