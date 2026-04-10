const syllabusService = require('../services/syllabusService');
const logger = require('../config/logger');

// Get syllabus progress for a subject
const getSyllabusProgress = async (req, res) => {
  try {
    const { subjectId, classId } = req.params;
    
    // Validate parameters
    if (!subjectId || !classId) {
      return res.status(400).json({ error: 'Subject ID and Class ID are required' });
    }
    
    const progress = await syllabusService.getSyllabusProgress(subjectId, classId);
    
    if (!progress) {
      return res.status(404).json({ error: 'Syllabus progress not found' });
    }
    
    res.json(progress);
  } catch (error) {
    logger.error('Error fetching syllabus progress:', error);
    res.status(500).json({ error: 'Failed to fetch syllabus progress' });
  }
};

// Update syllabus progress
const updateSyllabusProgress = async (req, res) => {
  try {
    const { subjectId, classId } = req.params;
    const { teacherId, ...progressData } = req.body;
    
    // Validate parameters
    if (!subjectId || !classId) {
      return res.status(400).json({ error: 'Subject ID and Class ID are required' });
    }
    
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }
    
    const progress = await syllabusService.updateSyllabusProgress(
      subjectId, 
      classId, 
      teacherId, 
      progressData
    );
    
    res.status(200).json(progress);
  } catch (error) {
    logger.error('Error updating syllabus progress:', error);
    res.status(500).json({ error: 'Failed to update syllabus progress' });
  }
};

// Get class analytics
const getClassAnalytics = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Validate parameter
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    
    const analytics = await syllabusService.getClassAnalytics(classId);
    
    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching class analytics:', error);
    res.status(500).json({ error: 'Failed to fetch class analytics' });
  }
};

// Get comparison data
const getComparisonData = async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    
    const filters = {};
    if (classId) filters.classId = classId;
    if (subjectId) filters.subjectId = subjectId;
    
    const comparisonData = await syllabusService.getComparisonData(filters);
    
    res.json(comparisonData);
  } catch (error) {
    logger.error('Error fetching comparison data:', error);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
};

// Generate progress report
const generateProgressReport = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Validate parameter
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    
    const report = await syllabusService.generateProgressReport(classId);
    
    res.json(report);
  } catch (error) {
    logger.error('Error generating progress report:', error);
    res.status(500).json({ error: 'Failed to generate progress report' });
  }
};

// Get progress notifications (enhanced implementation)
const getProgressNotifications = async (req, res) => {
  try {
    const { classId } = req.query;
    
    // Get all syllabus progress records for the class (if specified)
    // or for all classes the user is associated with
    const whereClause = {};
    if (classId) {
      whereClause.class_id = classId;
    }
    
    // In a real implementation, this would check for conditions that warrant notifications:
    // 1. Subjects that are behind schedule
    // 2. Subjects that have not been updated in a while
    // 3. Milestone completion notifications
    // 4. Upcoming deadlines
    
    const notifications = [];
    
    // Example notification logic:
    // 1. Check for subjects behind schedule
    // 2. Check for low progress subjects
    // 3. Check for upcoming deadlines
    
    res.json(notifications);
  } catch (error) {
    logger.error('Error fetching progress notifications:', error);
    res.status(500).json({ error: 'Failed to fetch progress notifications' });
  }
};

// Create a progress notification
const createProgressNotification = async (req, res) => {
  try {
    const { classId, subjectId, message, priority } = req.body;
    
    // Validate required fields
    if (!classId || !subjectId || !message) {
      return res.status(400).json({ error: 'Class ID, Subject ID, and message are required' });
    }
    
    // In a real implementation, this would create a notification record
    // and potentially send it via email, push notification, etc.
    
    const notification = {
      id: Date.now(), // Simple ID for demo
      classId,
      subjectId,
      message,
      priority: priority || 'medium',
      createdAt: new Date(),
      read: false
    };
    
    res.status(201).json(notification);
  } catch (error) {
    logger.error('Error creating progress notification:', error);
    res.status(500).json({ error: 'Failed to create progress notification' });
  }
};

module.exports = {
  getSyllabusProgress,
  updateSyllabusProgress,
  getClassAnalytics,
  getComparisonData,
  generateProgressReport,
  getProgressNotifications,
  createProgressNotification
};