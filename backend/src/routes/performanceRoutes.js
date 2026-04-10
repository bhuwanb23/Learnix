const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All performance routes require authentication
router.use(authenticateToken);

// Get student performance analysis
router.get('/students/:studentId/subjects/:subjectId/analysis', 
  authorizeRole('student', 'teacher'), 
  performanceController.getStudentPerformance
);

// Get weak topic detection
router.get('/students/:studentId/subjects/:subjectId/weak-topics', 
  authorizeRole('student', 'teacher'), 
  performanceController.getWeakTopics
);

// Get personalized study recommendations
router.get('/students/:studentId/subjects/:subjectId/recommendations', 
  authorizeRole('student', 'teacher'), 
  performanceController.getStudyRecommendations
);

// Get intervention suggestions (teacher only)
router.get('/students/:studentId/subjects/:subjectId/interventions', 
  authorizeRole('teacher'), 
  performanceController.getInterventionSuggestions
);

// Get performance trends
router.get('/students/:studentId/subjects/:subjectId/trends', 
  authorizeRole('student', 'teacher'), 
  performanceController.getPerformanceTrends
);

// Get adaptive study plan
router.post('/students/:studentId/subjects/:subjectId/study-plan', 
  authorizeRole('student', 'teacher'), 
  performanceController.getAdaptiveStudyPlan
);

// Trigger performance analysis
router.post('/students/:studentId/subjects/:subjectId/analyze', 
  authorizeRole('student', 'teacher'), 
  performanceController.analyzePerformance
);

module.exports = router;