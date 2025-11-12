const quizService = require('../services/quizService');
const logger = require('../config/logger');

// Create a new quiz
const createQuiz = async (req, res) => {
  try {
    const quizData = req.body;
    const teacherId = req.user.id; // Assuming user is authenticated

    const quiz = await quizService.createQuiz(quizData, teacherId);
    res.status(201).json({
      message: 'Quiz created successfully',
      quiz
    });
  } catch (error) {
    logger.error('Error in createQuiz controller:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get quiz by ID
const getQuizById = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizService.getQuizById(quizId);
    res.json(quiz);
  } catch (error) {
    logger.error('Error in getQuizById controller:', error);
    if (error.message === 'Quiz not found') {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update quiz
const updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quizData = req.body;

    const quiz = await quizService.updateQuiz(quizId, quizData);
    res.json({
      message: 'Quiz updated successfully',
      quiz
    });
  } catch (error) {
    logger.error('Error in updateQuiz controller:', error);
    if (error.message === 'Quiz not found') {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.status(400).json({ error: error.message });
  }
};

// Delete quiz
const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const result = await quizService.deleteQuiz(quizId);
    res.json(result);
  } catch (error) {
    logger.error('Error in deleteQuiz controller:', error);
    if (error.message === 'Quiz not found') {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get quizzes for a subject and class
const getQuizzesBySubjectAndClass = async (req, res) => {
  try {
    const { subjectId, classId } = req.params;
    const teacherId = req.user.role === 'teacher' ? req.user.id : null;

    const quizzes = await quizService.getQuizzesBySubjectAndClass(subjectId, classId, teacherId);
    res.json(quizzes);
  } catch (error) {
    logger.error('Error in getQuizzesBySubjectAndClass controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add question to quiz
const addQuestionToQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const questionData = req.body;

    const question = await quizService.addQuestionToQuiz(quizId, questionData);
    res.status(201).json({
      message: 'Question added successfully',
      question
    });
  } catch (error) {
    logger.error('Error in addQuestionToQuiz controller:', error);
    if (error.message === 'Quiz not found') {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.status(400).json({ error: error.message });
  }
};

// Get questions for quiz
const getQuestionsForQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const questions = await quizService.getQuestionsForQuiz(quizId);
    res.json(questions);
  } catch (error) {
    logger.error('Error in getQuestionsForQuiz controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update question
const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const questionData = req.body;

    const question = await quizService.updateQuestion(questionId, questionData);
    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    logger.error('Error in updateQuestion controller:', error);
    if (error.message === 'Question not found') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(400).json({ error: error.message });
  }
};

// Delete question
const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const result = await quizService.deleteQuestion(questionId);
    res.json(result);
  } catch (error) {
    logger.error('Error in deleteQuestion controller:', error);
    if (error.message === 'Question not found') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Start quiz attempt
const startQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user.id; // Assuming user is authenticated
    const { classId } = req.body;

    const attempt = await quizService.startQuizAttempt(quizId, studentId, classId);
    res.status(201).json({
      message: 'Quiz attempt started successfully',
      attempt
    });
  } catch (error) {
    logger.error('Error in startQuizAttempt controller:', error);
    if (error.message === 'Quiz not found' || error.message === 'Quiz is not published' || 
        error.message === 'Quiz is not active' || error.message === 'Quiz has not started yet' || 
        error.message === 'Quiz has already ended' || error.message === 'You have already completed this quiz') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit quiz answers
const submitQuizAnswers = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    const attempt = await quizService.submitQuizAnswers(attemptId, answers);
    res.json({
      message: 'Quiz answers submitted successfully',
      attempt
    });
  } catch (error) {
    logger.error('Error in submitQuizAnswers controller:', error);
    if (error.message === 'Quiz attempt not found' || error.message === 'Quiz not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

// Get quiz attempt by ID
const getQuizAttemptById = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await quizService.getQuizAttemptById(attemptId);
    res.json(attempt);
  } catch (error) {
    logger.error('Error in getQuizAttemptById controller:', error);
    if (error.message === 'Quiz attempt not found') {
      return res.status(404).json({ error: 'Quiz attempt not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get quiz attempts for student
const getQuizAttemptsForStudent = async (req, res) => {
  try {
    const studentId = req.user.id; // Assuming user is authenticated
    const { quizId } = req.params;

    const attempts = await quizService.getQuizAttemptsForStudent(studentId, quizId);
    res.json(attempts);
  } catch (error) {
    logger.error('Error in getQuizAttemptsForStudent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get quiz attempts for teacher
const getQuizAttemptsForTeacher = async (req, res) => {
  try {
    const teacherId = req.user.id; // Assuming user is authenticated
    const { quizId } = req.params;

    const attempts = await quizService.getQuizAttemptsForTeacher(teacherId, quizId);
    res.json(attempts);
  } catch (error) {
    logger.error('Error in getQuizAttemptsForTeacher controller:', error);
    if (error.message === 'Quiz not found or does not belong to this teacher') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate MCQs
const generateMCQs = async (req, res) => {
  try {
    const { subjectId, chapterId, topicId, count, difficulty } = req.body;
    
    const mcqs = await quizService.generateMCQs(subjectId, chapterId, topicId, count, difficulty);
    res.json({
      message: 'MCQs generated successfully',
      questions: mcqs
    });
  } catch (error) {
    logger.error('Error in generateMCQs controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get quiz analytics
const getQuizAnalytics = async (req, res) => {
  try {
    const { quizId } = req.params;
    
    const analytics = await quizService.getQuizAnalytics(quizId);
    res.json(analytics);
  } catch (error) {
    logger.error('Error in getQuizAnalytics controller:', error);
    if (error.message === 'Quiz not found') {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createQuiz,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizzesBySubjectAndClass,
  addQuestionToQuiz,
  getQuestionsForQuiz,
  updateQuestion,
  deleteQuestion,
  startQuizAttempt,
  submitQuizAnswers,
  getQuizAttemptById,
  getQuizAttemptsForStudent,
  getQuizAttemptsForTeacher,
  generateMCQs,
  getQuizAnalytics
};