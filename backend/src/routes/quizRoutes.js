const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Quiz management routes (teacher only)
router.post('/', authenticateToken, authorizeRole('teacher'), quizController.createQuiz);
router.get('/:quizId', authenticateToken, quizController.getQuizById);
router.put('/:quizId', authenticateToken, authorizeRole('teacher'), quizController.updateQuiz);
router.delete('/:quizId', authenticateToken, authorizeRole('teacher'), quizController.deleteQuiz);
router.get('/subject/:subjectId/class/:classId', authenticateToken, quizController.getQuizzesBySubjectAndClass);

// Question management routes (teacher only)
router.post('/:quizId/questions', authenticateToken, authorizeRole('teacher'), quizController.addQuestionToQuiz);
router.get('/:quizId/questions', authenticateToken, quizController.getQuestionsForQuiz);
router.put('/questions/:questionId', authenticateToken, authorizeRole('teacher'), quizController.updateQuestion);
router.delete('/questions/:questionId', authenticateToken, authorizeRole('teacher'), quizController.deleteQuestion);

// Quiz attempt routes (students)
router.post('/:quizId/attempts/start', authenticateToken, authorizeRole('student'), quizController.startQuizAttempt);
router.post('/attempts/:attemptId/submit', authenticateToken, authorizeRole('student'), quizController.submitQuizAnswers);
router.get('/attempts/:attemptId', authenticateToken, quizController.getQuizAttemptById);
router.get('/my-attempts', authenticateToken, authorizeRole('student'), quizController.getQuizAttemptsForStudent);
router.get('/my-attempts/:quizId', authenticateToken, authorizeRole('student'), quizController.getQuizAttemptsForStudent);

// Teacher analytics routes
router.get('/:quizId/attempts', authenticateToken, authorizeRole('teacher'), quizController.getQuizAttemptsForTeacher);
router.get('/:quizId/analytics', authenticateToken, authorizeRole('teacher'), quizController.getQuizAnalytics);

// MCQ generation routes (teacher only)
router.post('/generate-mcqs', authenticateToken, authorizeRole('teacher'), quizController.generateMCQs);

module.exports = router;