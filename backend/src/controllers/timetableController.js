const Timetable = require('../models/Timetable');
const logger = require('../config/logger');
const { realTimeService } = require('../../server');

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
    
    // Broadcast real-time update
    realTimeService.broadcastTimetableUpdate({
      action: 'created',
      data: timetable
    });
    
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
      returning: true
    });
    
    if (!timetable[0]) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    const updatedTimetable = await Timetable.findByPk(id);
    
    // Broadcast real-time update
    realTimeService.broadcastTimetableUpdate({
      action: 'updated',
      data: updatedTimetable
    });
    
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
      where: { id }
    });
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    // Broadcast real-time update
    realTimeService.broadcastTimetableUpdate({
      action: 'deleted',
      id: id
    });
    
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

module.exports = {
  getAllTimetables,
  getTimetableById,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getClassTimetable
};