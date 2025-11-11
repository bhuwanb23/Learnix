const Timetable = require('../models/Timetable');
const logger = require('../config/logger');
const { realTimeService } = require('../../server');

// Get all timetables
const getAllTimetables = async (req, res) => {
  try {
    const { courseId, classId, teacherId } = req.query;
    let filter = {};
    
    if (courseId) filter.courseId = courseId;
    if (classId) filter.classId = classId;
    if (teacherId) filter.teacherId = teacherId;
    
    const timetables = await Timetable.find(filter)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('teacherId')
      .sort({ dayOfWeek: 1, startTime: 1 });
    
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
    const timetable = await Timetable.findById(id)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('teacherId');
    
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
    const timetableData = req.body;
    const timetable = new Timetable(timetableData);
    await timetable.save();
    
    // Populate references
    const populatedTimetable = await Timetable.findById(timetable._id)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('teacherId');
    
    // Broadcast real-time update
    realTimeService.broadcastTimetableUpdate({
      action: 'created',
      data: populatedTimetable
    });
    
    res.status(201).json(populatedTimetable);
  } catch (error) {
    logger.error('Error creating timetable:', error);
    res.status(500).json({ error: 'Failed to create timetable' });
  }
};

// Update timetable
const updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const timetableData = req.body;
    
    const timetable = await Timetable.findByIdAndUpdate(
      id,
      timetableData,
      { new: true, runValidators: true }
    );
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    // Populate references
    const populatedTimetable = await Timetable.findById(timetable._id)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('teacherId');
    
    // Broadcast real-time update
    realTimeService.broadcastTimetableUpdate({
      action: 'updated',
      data: populatedTimetable
    });
    
    res.json(populatedTimetable);
  } catch (error) {
    logger.error('Error updating timetable:', error);
    res.status(500).json({ error: 'Failed to update timetable' });
  }
};

// Delete timetable
const deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const timetable = await Timetable.findByIdAndDelete(id);
    
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
    const timetables = await Timetable.find({ classId })
      .populate('subjectId')
      .populate('teacherId')
      .sort({ dayOfWeek: 1, startTime: 1 });
    
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