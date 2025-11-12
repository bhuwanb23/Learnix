const performanceAnalysisService = require('../services/performanceAnalysisService');
const recommendationService = require('../services/recommendationService');
const logger = require('../config/logger');

// Get student performance analysis
const getStudentPerformance = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const currentUserId = req.user.id;
    
    // Allow students to view their own performance or teachers to view their students' performance
    if (req.user.role === 'student' && parseInt(studentId) !== currentUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const analysis = await performanceAnalysisService.getStudentPerformanceAnalysis(studentId, subjectId);
    res.json(analysis);
  } catch (error) {
    logger.error('Error in getStudentPerformance controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get weak topic detection
const getWeakTopics = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const currentUserId = req.user.id;
    
    // Allow students to view their own data or teachers to view their students' data
    if (req.user.role === 'student' && parseInt(studentId) !== currentUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const weakTopics = await performanceAnalysisService.detectWeakTopicsAdvanced(studentId, subjectId);
    res.json(weakTopics);
  } catch (error) {
    logger.error('Error in getWeakTopics controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get personalized study recommendations
const getStudyRecommendations = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const currentUserId = req.user.id;
    
    // Allow students to view their own recommendations or teachers to view their students' recommendations
    if (req.user.role === 'student' && parseInt(studentId) !== currentUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const recommendations = await recommendationService.generateStudyRecommendations(studentId, subjectId);
    res.json(recommendations);
  } catch (error) {
    logger.error('Error in getStudyRecommendations controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get intervention suggestions
const getInterventionSuggestions = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const currentUserId = req.user.id;
    
    // Allow teachers to get intervention suggestions for their students
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Only teachers can access intervention suggestions.' });
    }
    
    const interventions = await recommendationService.getInterventionSuggestions(studentId, subjectId);
    res.json(interventions);
  } catch (error) {
    logger.error('Error in getInterventionSuggestions controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get performance trends
const getPerformanceTrends = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const { days } = req.query;
    const currentUserId = req.user.id;
    
    // Allow students to view their own trends or teachers to view their students' trends
    if (req.user.role === 'student' && parseInt(studentId) !== currentUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const trends = await performanceAnalysisService.getPerformanceTrends(
      studentId, 
      subjectId, 
      days ? parseInt(days) : 30
    );
    res.json(trends);
  } catch (error) {
    logger.error('Error in getPerformanceTrends controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get adaptive study plan
const getAdaptiveStudyPlan = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const preferences = req.body; // Study preferences like hours per day, etc.
    const currentUserId = req.user.id;
    
    // Allow students to view their own study plan or teachers to view their students' plan
    if (req.user.role === 'student' && parseInt(studentId) !== currentUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const studyPlan = await recommendationService.generateAdaptiveStudyPlan(studentId, subjectId, preferences);
    res.json(studyPlan);
  } catch (error) {
    logger.error('Error in getAdaptiveStudyPlan controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Trigger performance analysis
const analyzePerformance = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const currentUserId = req.user.id;
    
    // Allow students to analyze their own performance or teachers to analyze their students' performance
    if (req.user.role === 'student' && parseInt(studentId) !== currentUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const analysis = await performanceAnalysisService.analyzeStudentPerformance(studentId, subjectId);
    res.json(analysis);
  } catch (error) {
    logger.error('Error in analyzePerformance controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getStudentPerformance,
  getWeakTopics,
  getStudyRecommendations,
  getInterventionSuggestions,
  getPerformanceTrends,
  getAdaptiveStudyPlan,
  analyzePerformance
};