const logger = require('../config/logger');

// In-memory storage for notifications (in a real app, you'd use a database)
const notifications = [];

// Send attendance notification
const sendAttendanceNotification = async (recipient, type, data) => {
  try {
    // Create notification object
    const notification = {
      id: Date.now().toString(),
      recipient,
      type,
      data,
      timestamp: new Date(),
      read: false
    };
    
    // Store notification
    notifications.push(notification);
    
    // In a real implementation, you would:
    // 1. Send email notification
    // 2. Send SMS notification
    // 3. Send push notification through Firebase/Apple Push Notification Service
    // 4. Send notification through WebSocket for real-time updates
    
    logger.info(`Attendance notification sent to ${recipient}`, { type, data });
    
    return notification;
  } catch (error) {
    logger.error('Error sending attendance notification:', error);
    throw error;
  }
};

// Send low attendance alert
const sendLowAttendanceAlert = async (studentId, parentId, attendanceRate, classId) => {
  try {
    const message = `Attention: Student ${studentId} has a low attendance rate of ${attendanceRate}% in class ${classId}. Please contact the student to address this issue.`;
    
    // Send notification to parent
    await sendAttendanceNotification(parentId, 'low_attendance_alert', {
      studentId,
      attendanceRate,
      classId,
      message
    });
    
    // Send notification to teacher/admin
    // In a real implementation, you would get the teacher/admin ID from the class
    await sendAttendanceNotification('admin', 'student_low_attendance', {
      studentId,
      attendanceRate,
      classId,
      message
    });
    
    return { success: true, message: 'Low attendance alerts sent' };
  } catch (error) {
    logger.error('Error sending low attendance alert:', error);
    throw error;
  }
};

// Send attendance summary notification
const sendAttendanceSummary = async (recipient, summaryData) => {
  try {
    const message = `Attendance Summary: Class ${summaryData.classId} has an overall attendance rate of ${summaryData.attendanceRate}%.`;
    
    await sendAttendanceNotification(recipient, 'attendance_summary', {
      ...summaryData,
      message
    });
    
    return { success: true, message: 'Attendance summary notification sent' };
  } catch (error) {
    logger.error('Error sending attendance summary:', error);
    throw error;
  }
};

// Send fraud alert notification
const sendFraudAlert = async (recipient, fraudData) => {
  try {
    const message = `Attendance Fraud Alert: Suspicious activity detected in class ${fraudData.classId}. Please review attendance records.`;
    
    await sendAttendanceNotification(recipient, 'fraud_alert', {
      ...fraudData,
      message
    });
    
    return { success: true, message: 'Fraud alert notification sent' };
  } catch (error) {
    logger.error('Error sending fraud alert:', error);
    throw error;
  }
};

// Get notifications for a recipient
const getNotifications = async (recipient, limit = 10) => {
  try {
    // Filter notifications for recipient and sort by timestamp (newest first)
    const userNotifications = notifications
      .filter(notification => notification.recipient === recipient)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    return userNotifications;
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    throw error;
  }
};

// Mark notification as read
const markNotificationAsRead = async (notificationId) => {
  try {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return { success: true, notification };
    }
    
    return { success: false, error: 'Notification not found' };
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    throw error;
  }
};

// Get unread notification count
const getUnreadNotificationCount = async (recipient) => {
  try {
    const unreadCount = notifications
      .filter(notification => 
        notification.recipient === recipient && !notification.read
      ).length;
    
    return { unreadCount };
  } catch (error) {
    logger.error('Error fetching unread notification count:', error);
    throw error;
  }
};

// Send real-time notification through WebSocket
const sendRealTimeNotification = async (socket, eventType, data) => {
  try {
    // In a real implementation, you would emit to the specific socket
    // socket.emit(eventType, data);
    
    // For now, we'll just log the event
    logger.info(`Real-time notification sent: ${eventType}`, data);
    
    return { success: true, message: 'Real-time notification sent' };
  } catch (error) {
    logger.error('Error sending real-time notification:', error);
    throw error;
  }
};

module.exports = {
  sendAttendanceNotification,
  sendLowAttendanceAlert,
  sendAttendanceSummary,
  sendFraudAlert,
  getNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
  sendRealTimeNotification
};