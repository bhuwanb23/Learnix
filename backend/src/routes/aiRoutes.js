const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const {
  getTopicSummary,
  getTopicExplanation,
  getTopicExamples,
  getPracticeQuestions,
  getSubjectAIContent,
  assessContentQuality,
  cleanupExpiredContent
} = require('../controllers/aiController');

// Get topic summary
router.get('/summary/:subjectId/:chapterId/:topicId', 
  authenticateToken, 
  getTopicSummary
);

// Get topic explanation
router.get('/explanation/:subjectId/:chapterId/:topicId', 
  authenticateToken, 
  getTopicExplanation
);

// Get topic examples
router.get('/examples/:subjectId/:chapterId/:topicId', 
  authenticateToken, 
  getTopicExamples
);

// Get practice questions
router.get('/questions/:subjectId/:chapterId/:topicId', 
  authenticateToken, 
  getPracticeQuestions
);

// Get all AI content for a subject
router.get('/content/:subjectId', 
  authenticateToken, 
  getSubjectAIContent
);

// Assess content quality
router.get('/quality/:contentId', 
  authenticateToken, 
  assessContentQuality
);

// Cleanup expired content (admin only)
router.delete('/cleanup', 
  authenticateToken, 
  authorizeRole(['admin']), 
  cleanupExpiredContent
);

module.exports = router;