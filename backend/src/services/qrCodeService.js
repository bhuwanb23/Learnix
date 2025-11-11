const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../config/logger');

// Generate a unique QR code for an attendance session
const generateAttendanceQRCode = async (classId, subjectId, date, teacherId) => {
  try {
    // Create a unique session identifier
    const sessionId = crypto.createHash('sha256')
      .update(`${classId}-${subjectId}-${date}-${teacherId}-${Date.now()}`)
      .digest('hex');
    
    // Create the QR code data
    const qrData = {
      sessionId,
      classId,
      subjectId,
      date,
      teacherId,
      timestamp: new Date().toISOString()
    };
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
    
    return {
      sessionId,
      qrCodeDataUrl,
      qrData
    };
  } catch (error) {
    logger.error('Error generating attendance QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

// Validate QR code data
const validateAttendanceQRCode = (qrData, classId, subjectId, date) => {
  try {
    const parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    
    // Check if required fields exist
    if (!parsedData.sessionId || !parsedData.classId || !parsedData.subjectId || !parsedData.date || !parsedData.teacherId) {
      return { valid: false, error: 'Invalid QR code data structure' };
    }
    
    // Check if the QR code is for the correct class and subject
    if (parsedData.classId !== classId || parsedData.subjectId !== subjectId) {
      return { valid: false, error: 'QR code does not match class or subject' };
    }
    
    // Check if the date matches (within the same day)
    const qrDate = new Date(parsedData.date);
    const currentDate = new Date(date);
    
    if (qrDate.toDateString() !== currentDate.toDateString()) {
      return { valid: false, error: 'QR code is not valid for today' };
    }
    
    // Check if QR code is not too old (5 minutes expiration)
    const qrTimestamp = new Date(parsedData.timestamp);
    const now = new Date();
    const timeDiff = Math.abs(now - qrTimestamp);
    const minutesDiff = Math.floor(timeDiff / 60000);
    
    if (minutesDiff > 5) {
      return { valid: false, error: 'QR code has expired' };
    }
    
    return { valid: true, data: parsedData };
  } catch (error) {
    logger.error('Error validating attendance QR code:', error);
    return { valid: false, error: 'Invalid QR code format' };
  }
};

module.exports = {
  generateAttendanceQRCode,
  validateAttendanceQRCode
};