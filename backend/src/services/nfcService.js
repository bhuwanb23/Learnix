const logger = require('../config/logger');

// Generate a unique NFC tag identifier for an attendance session
const generateNFCTagId = (classId, subjectId, date, teacherId) => {
  try {
    // In a real implementation, this would interface with NFC hardware
    // For now, we'll generate a unique identifier based on the session details
    const sessionId = `${classId}-${subjectId}-${date}-${teacherId}`;
    
    // Create a hash of the session data for the NFC tag
    const crypto = require('crypto');
    const tagId = crypto.createHash('sha256')
      .update(sessionId)
      .digest('hex')
      .substring(0, 16); // Shorten for practical NFC tag IDs
    
    return {
      tagId,
      sessionId
    };
  } catch (error) {
    logger.error('Error generating NFC tag ID:', error);
    throw new Error('Failed to generate NFC tag ID');
  }
};

// Validate NFC tag data
const validateNFCTag = (tagData, classId, subjectId, date) => {
  try {
    // In a real implementation, this would read from NFC hardware
    // For now, we'll validate the tag data structure
    
    if (!tagData || !tagData.tagId || !tagData.sessionId) {
      return { valid: false, error: 'Invalid NFC tag data' };
    }
    
    // Extract session info from sessionId
    const sessionParts = tagData.sessionId.split('-');
    if (sessionParts.length < 4) {
      return { valid: false, error: 'Invalid session ID format' };
    }
    
    const [tagClassId, tagSubjectId, tagDate, tagTeacherId] = sessionParts;
    
    // Validate class and subject
    if (tagClassId !== classId || tagSubjectId !== subjectId) {
      return { valid: false, error: 'NFC tag does not match class or subject' };
    }
    
    // Validate date (within the same day)
    const tagDateObj = new Date(tagDate);
    const currentDateObj = new Date(date);
    
    if (tagDateObj.toDateString() !== currentDateObj.toDateString()) {
      return { valid: false, error: 'NFC tag is not valid for today' };
    }
    
    return { valid: true, data: tagData };
  } catch (error) {
    logger.error('Error validating NFC tag:', error);
    return { valid: false, error: 'Invalid NFC tag format' };
  }
};

module.exports = {
  generateNFCTagId,
  validateNFCTag
};