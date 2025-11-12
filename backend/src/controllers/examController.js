const examService = require('../services/examService');
const { Exam, ExamResult } = require('../models');
const logger = require('../config/logger');

// Create a new exam
const createExam = async (req, res) => {
  try {
    const examData = {
      ...req.body,
      scheduled_by: req.user.id
    };

    const exam = await examService.createExam(examData);
    res.status(201).json(exam);
  } catch (error) {
    logger.error('Error in createExam controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get exam by ID
const getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await examService.getExamById(id);
    
    // Check permissions - teachers can always view, students only if in the class
    if (req.user.role === 'student') {
      // In a real implementation, you would check if the student is in the class
      // For now, we'll allow access if the exam is published
      if (!exam.is_published) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(exam);
  } catch (error) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: 'Exam not found' });
    }
    logger.error('Error in getExamById controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get exams by class
const getExamsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { exam_type, is_published } = req.query;
    
    const filters = {};
    if (exam_type) filters.exam_type = exam_type;
    if (is_published !== undefined) filters.is_published = is_published === 'true';
    
    const exams = await examService.getExamsByClass(classId, filters);
    res.json(exams);
  } catch (error) {
    logger.error('Error in getExamsByClass controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update exam
const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await examService.getExamById(id);
    
    // Check if user is the creator of the exam
    if (exam.scheduled_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedExam = await examService.updateExam(id, req.body);
    res.json(updatedExam);
  } catch (error) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: 'Exam not found' });
    }
    logger.error('Error in updateExam controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete exam
const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await examService.getExamById(id);
    
    // Check if user is the creator of the exam
    if (exam.scheduled_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await examService.deleteExam(id);
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: 'Exam not found' });
    }
    logger.error('Error in deleteExam controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Publish exam
const publishExam = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is authorized to publish
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const exam = await examService.publishExam(id);
    res.json(exam);
  } catch (error) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: 'Exam not found' });
    }
    logger.error('Error in publishExam controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create exam result
const createExamResult = async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Check if user is authorized to create results
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const resultData = {
      ...req.body,
      exam_id: examId
    };

    const result = await examService.createExamResult(resultData);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error in createExamResult controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get exam results by exam
const getExamResultsByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Check if user is authorized to view results
    const exam = await examService.getExamById(examId);
    if (req.user.role === 'student') {
      // Students can only view their own results
      const results = await examService.getExamResultsByStudent(req.user.id, { exam_id: examId });
      return res.json(results);
    }
    
    if (req.user.role === 'teacher' && exam.scheduled_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const results = await examService.getExamResultsByExam(examId);
    res.json(results);
  } catch (error) {
    logger.error('Error in getExamResultsByExam controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update exam result
const updateExamResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    
    // Check if user is authorized to update results
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await examService.updateExamResult(resultId, req.body, req.user.id);
    res.json(result);
  } catch (error) {
    if (error.message === 'Exam result not found') {
      return res.status(404).json({ error: 'Exam result not found' });
    }
    logger.error('Error in updateExamResult controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Publish exam results
const publishExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Check if user is authorized to publish results
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const exam = await examService.publishExamResults(examId);
    res.json(exam);
  } catch (error) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: 'Exam not found' });
    }
    logger.error('Error in publishExamResults controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get exam calendar
const getExamCalendar = async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const exams = await examService.getExamCalendar(classId, new Date(startDate), new Date(endDate));
    res.json(exams);
  } catch (error) {
    logger.error('Error in getExamCalendar controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get exam statistics
const getExamStatistics = async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Check if user is authorized
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const statistics = await examService.calculateExamStatistics(examId);
    res.json(statistics);
  } catch (error) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: 'Exam not found' });
    }
    logger.error('Error in getExamStatistics controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get result audit trail
const getResultAuditTrail = async (req, res) => {
  try {
    const { resultId } = req.params;
    
    // Check if user is authorized
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const auditTrail = await examService.getResultAuditTrail(resultId);
    res.json(auditTrail);
  } catch (error) {
    if (error.message === 'Exam result not found') {
      return res.status(404).json({ error: 'Exam result not found' });
    }
    logger.error('Error in getResultAuditTrail controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createExam,
  getExamById,
  getExamsByClass,
  updateExam,
  deleteExam,
  publishExam,
  createExamResult,
  getExamResultsByExam,
  updateExamResult,
  publishExamResults,
  getExamCalendar,
  getExamStatistics,
  getResultAuditTrail
};