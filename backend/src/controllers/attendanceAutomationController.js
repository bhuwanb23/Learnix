const Attendance = require('../models/Attendance');
const { generateAttendanceQRCode, validateAttendanceQRCode } = require('../services/qrCodeService');
const { generateNFCTagId, validateNFCTag } = require('../services/nfcService');
const logger = require('../config/logger');

// Generate QR code for attendance session
const generateQRCode = async (req, res) => {
  try {
    const { classId, subjectId, date, teacherId } = req.body;
    
    // Validate required fields
    if (!classId || !subjectId || !date || !teacherId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['classId', 'subjectId', 'date', 'teacherId'] 
      });
    }
    
    // Generate QR code
    const qrCodeData = await generateAttendanceQRCode(classId, subjectId, date, teacherId);
    
    res.json({
      message: 'QR code generated successfully',
      ...qrCodeData
    });
  } catch (error) {
    logger.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

// Record attendance via QR code scan
const recordAttendanceByQR = async (req, res) => {
  try {
    const { qrData, studentId, classId, subjectId, date } = req.body;
    
    // Validate required fields
    if (!qrData || !studentId || !classId || !subjectId || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['qrData', 'studentId', 'classId', 'subjectId', 'date'] 
      });
    }
    
    // Validate QR code
    const validation = validateAttendanceQRCode(qrData, classId, subjectId, date);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid QR code', 
        details: validation.error 
      });
    }
    
    // Check if attendance record already exists for this student/session
    const existingAttendance = await Attendance.findOne({
      where: {
        student_id: studentId,
        class_id: classId,
        subject_id: subjectId,
        date: new Date(date)
      }
    });
    
    if (existingAttendance) {
      return res.status(409).json({ 
        error: 'Attendance already recorded for this student in this session' 
      });
    }
    
    // Create attendance record
    const attendanceData = {
      course_id: validation.data.courseId || 'N/A', // Course ID might not be in QR code
      class_id: classId,
      subject_id: subjectId,
      teacher_id: validation.data.teacherId,
      student_id: studentId,
      date: new Date(date),
      status: 'present',
      method: 'qr',
      recorded_by: studentId // Student recorded their own attendance
    };
    
    const attendance = await Attendance.create(attendanceData);
    
    res.status(201).json({
      message: 'Attendance recorded successfully via QR code',
      data: attendance
    });
  } catch (error) {
    logger.error('Error recording attendance via QR code:', error);
    res.status(500).json({ error: 'Failed to record attendance via QR code' });
  }
};

// Generate NFC tag for attendance session
const generateNFCTag = async (req, res) => {
  try {
    const { classId, subjectId, date, teacherId } = req.body;
    
    // Validate required fields
    if (!classId || !subjectId || !date || !teacherId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['classId', 'subjectId', 'date', 'teacherId'] 
      });
    }
    
    // Generate NFC tag
    const nfcTagData = generateNFCTagId(classId, subjectId, date, teacherId);
    
    res.json({
      message: 'NFC tag generated successfully',
      ...nfcTagData
    });
  } catch (error) {
    logger.error('Error generating NFC tag:', error);
    res.status(500).json({ error: 'Failed to generate NFC tag' });
  }
};

// Record attendance via NFC tag scan
const recordAttendanceByNFC = async (req, res) => {
  try {
    const { tagData, studentId, classId, subjectId, date } = req.body;
    
    // Validate required fields
    if (!tagData || !studentId || !classId || !subjectId || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['tagData', 'studentId', 'classId', 'subjectId', 'date'] 
      });
    }
    
    // Validate NFC tag
    const validation = validateNFCTag(tagData, classId, subjectId, date);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid NFC tag', 
        details: validation.error 
      });
    }
    
    // Check if attendance record already exists for this student/session
    const existingAttendance = await Attendance.findOne({
      where: {
        student_id: studentId,
        class_id: classId,
        subject_id: subjectId,
        date: new Date(date)
      }
    });
    
    if (existingAttendance) {
      return res.status(409).json({ 
        error: 'Attendance already recorded for this student in this session' 
      });
    }
    
    // Create attendance record
    const attendanceData = {
      course_id: 'N/A', // Course ID might not be in NFC tag
      class_id: classId,
      subject_id: subjectId,
      teacher_id: validation.data.teacherId,
      student_id: studentId,
      date: new Date(date),
      status: 'present',
      method: 'nfc',
      recorded_by: studentId // Student recorded their own attendance
    };
    
    const attendance = await Attendance.create(attendanceData);
    
    res.status(201).json({
      message: 'Attendance recorded successfully via NFC tag',
      data: attendance
    });
  } catch (error) {
    logger.error('Error recording attendance via NFC tag:', error);
    res.status(500).json({ error: 'Failed to record attendance via NFC tag' });
  }
};

module.exports = {
  generateQRCode,
  recordAttendanceByQR,
  generateNFCTag,
  recordAttendanceByNFC
};