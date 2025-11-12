const AIService = require('../services/aiService');
const logger = require('../config/logger');

// Get topic summary
const getTopicSummary = async (req, res) => {
  try {
    const { subjectId, chapterId, topicId } = req.params;
    const options = req.query || {};
    
    const summary = await AIService.getTopicSummary(subjectId, chapterId, topicId, options);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error getting topic summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get topic explanation
const getTopicExplanation = async (req, res) => {
  try {
    const { subjectId, chapterId, topicId } = req.params;
    const { difficulty } = req.query;
    
    const explanation = await AIService.getTopicExplanation(subjectId, chapterId, topicId, difficulty);
    
    res.status(200).json({
      success: true,
      data: explanation
    });
  } catch (error) {
    logger.error('Error getting topic explanation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get topic examples
const getTopicExamples = async (req, res) => {
  try {
    const { subjectId, chapterId, topicId } = req.params;
    const { count } = req.query;
    
    const examples = await AIService.getTopicExamples(subjectId, chapterId, topicId, parseInt(count) || 3);
    
    res.status(200).json({
      success: true,
      data: examples
    });
  } catch (error) {
    logger.error('Error getting topic examples:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get practice questions
const getPracticeQuestions = async (req, res) => {
  try {
    const { subjectId, chapterId, topicId } = req.params;
    const { count } = req.query;
    
    const questions = await AIService.getPracticeQuestions(subjectId, chapterId, topicId, parseInt(count) || 5);
    
    res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    logger.error('Error getting practice questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all AI content for a subject
const getSubjectAIContent = async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const content = await AIService.getSubjectAIContent(subjectId);
    
    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    logger.error('Error getting subject AI content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Assess content quality
const assessContentQuality = async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const assessment = await AIService.assessContentQuality(contentId);
    
    res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (error) {
    logger.error('Error assessing content quality:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Cleanup expired content (admin only)
const cleanupExpiredContent = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }
    
    const deletedCount = await AIService.cleanupExpiredContent();
    
    res.status(200).json({
      success: true,
      message: `Cleaned up ${deletedCount} expired content records`
    });
  } catch (error) {
    logger.error('Error cleaning up expired content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getTopicSummary,
  getTopicExplanation,
  getTopicExamples,
  getPracticeQuestions,
  getSubjectAIContent,
  assessContentQuality,
  cleanupExpiredContent
};