const {
  sendLowAttendanceAlert,
  getNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount
} = require('../services/notificationService');
const logger = require('../config/logger');

// Send low attendance alert notification
const sendLowAttendanceAlertNotification = async (req, res) => {
  try {
    const { studentId, parentId, attendanceRate, classId } = req.body;
    
    // Validate required fields
    if (!studentId || !parentId || !attendanceRate || !classId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['studentId', 'parentId', 'attendanceRate', 'classId'] 
      });
    }
    
    // Send low attendance alert
    const result = await sendLowAttendanceAlert(studentId, parentId, attendanceRate, classId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error sending low attendance alert notification:', error);
    res.status(500).json({ error: 'Failed to send low attendance alert notification' });
  }
};

// Get notifications for current user
const getUserNotifications = async (req, res) => {
  try {
    // In a real implementation, you would get the user ID from the authenticated user
    // For now, we'll use a placeholder
    const userId = req.user.id || 'user';
    const { limit } = req.query;
    
    const notifications = await getNotifications(userId, limit ? parseInt(limit) : 10);
    
    res.json({
      userId,
      notifications
    });
  } catch (error) {
    logger.error('Error fetching user notifications:', error);
    res.status(500).json({ error: 'Failed to fetch user notifications' });
  }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    if (!notificationId) {
      return res.status(400).json({ error: 'Missing notificationId parameter' });
    }
    
    const result = await markNotificationAsRead(notificationId);
    
    if (!result.success) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    // In a real implementation, you would get the user ID from the authenticated user
    const userId = req.user.id || 'user';
    
    const result = await getUnreadNotificationCount(userId);
    
    res.json({
      userId,
      ...result
    });
  } catch (error) {
    logger.error('Error fetching unread notification count:', error);
    res.status(500).json({ error: 'Failed to fetch unread notification count' });
  }
};

module.exports = {
  sendLowAttendanceAlertNotification,
  getUserNotifications,
  markNotificationRead,
  getUnreadCount
};