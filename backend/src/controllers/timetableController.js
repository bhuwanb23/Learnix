const Timetable = require('../models/Timetable');
const TimetableHistory = require('../models/TimetableHistory');
const TimetableExport = require('../utils/timetableExport');
const logger = require('../config/logger');
// Remove the realTimeService import as it's causing circular dependency issues

// Get all timetables
const getAllTimetables = async (req, res) => {
  try {
    const { courseId, classId, teacherId } = req.query;
    let where = {};
    
    if (courseId) where.course_id = courseId;
    if (classId) where.class_id = classId;
    if (teacherId) where.teacher_id = teacherId;
    
    const timetables = await Timetable.findAll({
      where,
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
    });
    
    res.json(timetables);
  } catch (error) {
    logger.error('Error fetching timetables:', error);
    res.status(500).json({ error: 'Failed to fetch timetables' });
  }
};

// Get timetable by ID
const getTimetableById = async (req, res) => {
  try {
    const { id } = req.params;
    const timetable = await Timetable.findByPk(id);
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    res.json(timetable);
  } catch (error) {
    logger.error('Error fetching timetable:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
};

// Create new timetable
const createTimetable = async (req, res) => {
  try {
    const timetableData = {
      course_id: req.body.courseId,
      class_id: req.body.classId,
      subject_id: req.body.subjectId,
      teacher_id: req.body.teacherId,
      room_id: req.body.roomId,
      day_of_week: req.body.dayOfWeek,
      start_time: req.body.startTime,
      end_time: req.body.endTime,
      start_date: req.body.startDate,
      end_date: req.body.endDate,
      is_active: req.body.isActive
    };
    
    const timetable = await Timetable.create(timetableData);
    
    // Create initial history record
    const historyData = {
      timetable_id: timetable.id,
      course_id: timetable.course_id,
      class_id: timetable.class_id,
      subject_id: timetable.subject_id,
      teacher_id: timetable.teacher_id,
      room_id: timetable.room_id,
      day_of_week: timetable.day_of_week,
      start_time: timetable.start_time,
      end_time: timetable.end_time,
      start_date: timetable.start_date,
      end_date: timetable.end_date,
      is_active: timetable.is_active,
      action: 'created',
      changed_by: req.user.id
    };
    
    await TimetableHistory.create(historyData);
    
    // Broadcast real-time update (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.status(201).json(timetable);
  } catch (error) {
    logger.error('Error creating timetable:', error);
    res.status(500).json({ error: 'Failed to create timetable' });
  }
};

// Update timetable
const updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const timetableData = {
      course_id: req.body.courseId,
      class_id: req.body.classId,
      subject_id: req.body.subjectId,
      teacher_id: req.body.teacherId,
      room_id: req.body.roomId,
      day_of_week: req.body.dayOfWeek,
      start_time: req.body.startTime,
      end_time: req.body.endTime,
      start_date: req.body.startDate,
      end_date: req.body.endDate,
      is_active: req.body.isActive
    };
    
    const timetable = await Timetable.update(timetableData, {
      where: { id },
      returning: true,
      userId: req.user.id // Pass user ID for history tracking
    });
    
    if (!timetable[0]) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    const updatedTimetable = await Timetable.findByPk(id);
    
    // Broadcast real-time update (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.json(updatedTimetable);
  } catch (error) {
    logger.error('Error updating timetable:', error);
    res.status(500).json({ error: 'Failed to update timetable' });
  }
};

// Delete timetable
const deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const timetable = await Timetable.destroy({
      where: { id },
      userId: req.user.id // Pass user ID for history tracking
    });
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    // Broadcast real-time update (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    logger.error('Error deleting timetable:', error);
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
};

// Get timetable for a specific class
const getClassTimetable = async (req, res) => {
  try {
    const { classId } = req.params;
    const timetables = await Timetable.findAll({
      where: { class_id: classId },
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
    });
    
    res.json(timetables);
  } catch (error) {
    logger.error('Error fetching class timetable:', error);
    res.status(500).json({ error: 'Failed to fetch class timetable' });
  }
};

// Get timetable history
const getTimetableHistory = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const history = await TimetableHistory.findAll({
      where: { timetable_id: timetableId },
      order: [['created_at', 'DESC']]
    });
    
    res.json(history);
  } catch (error) {
    logger.error('Error fetching timetable history:', error);
    res.status(500).json({ error: 'Failed to fetch timetable history' });
  }
};

// Rollback timetable to a previous version
const rollbackTimetable = async (req, res) => {
  try {
    const { timetableId, historyId } = req.params;
    
    // Get the historical version
    const historyRecord = await TimetableHistory.findByPk(historyId);
    if (!historyRecord) {
      return res.status(404).json({ error: 'History record not found' });
    }
    
    // Update the current timetable with historical data
    const timetableData = {
      course_id: historyRecord.course_id,
      class_id: historyRecord.class_id,
      subject_id: historyRecord.subject_id,
      teacher_id: historyRecord.teacher_id,
      room_id: historyRecord.room_id,
      day_of_week: historyRecord.day_of_week,
      start_time: historyRecord.start_time,
      end_time: historyRecord.end_time,
      start_date: historyRecord.start_date,
      end_date: historyRecord.end_date,
      is_active: historyRecord.is_active
    };
    
    const timetable = await Timetable.update(timetableData, {
      where: { id: timetableId },
      returning: true,
      userId: req.user.id // Pass user ID for history tracking
    });
    
    if (!timetable[0]) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    const updatedTimetable = await Timetable.findByPk(timetableId);
    
    // Broadcast real-time update (if realTimeService is available)
    // We'll skip this for now to avoid circular dependency issues
    
    res.json(updatedTimetable);
  } catch (error) {
    logger.error('Error rolling back timetable:', error);
    res.status(500).json({ error: 'Failed to rollback timetable' });
  }
};

// Export timetable as PDF
const exportTimetablePDF = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Get timetable data
    const timetables = await Timetable.findAll({
      where: { class_id: classId },
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
    });
    
    // Get class name (in a real implementation, you would fetch this from the database)
    const className = `Class ${classId}`;
    
    // Generate PDF
    const pdfBuffer = await TimetableExport.exportToPDF(timetables, className);
    
    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=timetable-${classId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error exporting timetable as PDF:', error);
    res.status(500).json({ error: 'Failed to export timetable as PDF' });
  }
};

// Export timetable as CSV
const exportTimetableCSV = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Get timetable data
    const timetables = await Timetable.findAll({
      where: { class_id: classId },
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
    });
    
    // Get class name (in a real implementation, you would fetch this from the database)
    const className = `Class ${classId}`;
    
    // Generate CSV
    const csvData = await TimetableExport.exportToCSV(timetables, className);
    
    // Send CSV as response
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=timetable-${classId}.csv`);
    res.send(csvData);
  } catch (error) {
    logger.error('Error exporting timetable as CSV:', error);
    res.status(500).json({ error: 'Failed to export timetable as CSV' });
  }
};

module.exports = {
  getAllTimetables,
  getTimetableById,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getClassTimetable,
  getTimetableHistory,
  rollbackTimetable,
  exportTimetablePDF,
  exportTimetableCSV
};