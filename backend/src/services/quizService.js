const { Quiz, Question, QuizAttempt, Subject, Class, User } = require('../models');
const logger = require('../config/logger');
const aiService = require('./aiService');

class QuizService {
  // Create a new quiz
  async createQuiz(quizData, teacherId) {
    try {
      // Validate that subject and class exist
      const subject = await Subject.findByPk(quizData.subject_id);
      if (!subject) {
        throw new Error('Subject not found');
      }

      const classObj = await Class.findByPk(quizData.class_id);
      if (!classObj) {
        throw new Error('Class not found');
      }

      // Create quiz
      const quiz = await Quiz.create({
        ...quizData,
        teacher_id: teacherId,
        question_count: 0,
        total_marks: 0
      });

      logger.info('Quiz created successfully', { quizId: quiz.id });
      return quiz;
    } catch (error) {
      logger.error('Error creating quiz:', error);
      throw error;
    }
  }

  // Get quiz by ID
  async getQuizById(quizId) {
    try {
      const quiz = await Quiz.findByPk(quizId, {
        include: [
          {
            model: Subject,
            attributes: ['id', 'name', 'code']
          },
          {
            model: Class,
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ]
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      return quiz;
    } catch (error) {
      logger.error('Error fetching quiz:', error);
      throw error;
    }
  }

  // Update quiz
  async updateQuiz(quizId, quizData) {
    try {
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz) {
        throw new Error('Quiz not found');
      }

      await quiz.update(quizData);
      logger.info('Quiz updated successfully', { quizId: quiz.id });
      return quiz;
    } catch (error) {
      logger.error('Error updating quiz:', error);
      throw error;
    }
  }

  // Delete quiz
  async deleteQuiz(quizId) {
    try {
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Also delete all questions for this quiz
      await Question.destroy({ where: { quiz_id: quizId } });
      
      await quiz.destroy();
      logger.info('Quiz deleted successfully', { quizId: quiz.id });
      return { message: 'Quiz deleted successfully' };
    } catch (error) {
      logger.error('Error deleting quiz:', error);
      throw error;
    }
  }

  // Get quizzes for a subject and class
  async getQuizzesBySubjectAndClass(subjectId, classId, teacherId = null) {
    try {
      const whereClause = {
        subject_id: subjectId,
        class_id: classId
      };

      // If teacherId is provided, filter by teacher
      if (teacherId) {
        whereClause.teacher_id = teacherId;
      }

      const quizzes = await Quiz.findAll({
        where: whereClause,
        include: [
          {
            model: Subject,
            attributes: ['id', 'name', 'code']
          },
          {
            model: Class,
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      return quizzes;
    } catch (error) {
      logger.error('Error fetching quizzes:', error);
      throw error;
    }
  }

  // Add question to quiz
  async addQuestionToQuiz(quizId, questionData) {
    try {
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz) {
        throw new Error('Quiz not found');
      }

      const question = await Question.create({
        ...questionData,
        quiz_id: quizId
      });

      // Update quiz question count and total marks
      quiz.question_count += 1;
      quiz.total_marks = (parseFloat(quiz.total_marks) || 0) + (parseFloat(questionData.marks) || 1);
      await quiz.save();

      logger.info('Question added to quiz successfully', { quizId, questionId: question.id });
      return question;
    } catch (error) {
      logger.error('Error adding question to quiz:', error);
      throw error;
    }
  }

  // Get questions for a quiz
  async getQuestionsForQuiz(quizId) {
    try {
      const questions = await Question.findAll({
        where: {
          quiz_id: quizId,
          is_active: true
        },
        order: [['order_index', 'ASC']]
      });

      return questions;
    } catch (error) {
      logger.error('Error fetching questions for quiz:', error);
      throw error;
    }
  }

  // Update question
  async updateQuestion(questionId, questionData) {
    try {
      const question = await Question.findByPk(questionId);
      if (!question) {
        throw new Error('Question not found');
      }

      // If marks are being updated, we need to update the quiz total marks
      if (questionData.marks !== undefined && questionData.marks !== question.marks) {
        const quiz = await Quiz.findByPk(question.quiz_id);
        if (quiz) {
          quiz.total_marks = (parseFloat(quiz.total_marks) || 0) - (parseFloat(question.marks) || 0) + (parseFloat(questionData.marks) || 0);
          await quiz.save();
        }
      }

      await question.update(questionData);
      logger.info('Question updated successfully', { questionId: question.id });
      return question;
    } catch (error) {
      logger.error('Error updating question:', error);
      throw error;
    }
  }

  // Delete question
  async deleteQuestion(questionId) {
    try {
      const question = await Question.findByPk(questionId);
      if (!question) {
        throw new Error('Question not found');
      }

      // Update quiz question count and total marks
      const quiz = await Quiz.findByPk(question.quiz_id);
      if (quiz) {
        quiz.question_count -= 1;
        quiz.total_marks = (parseFloat(quiz.total_marks) || 0) - (parseFloat(question.marks) || 0);
        await quiz.save();
      }

      await question.destroy();
      logger.info('Question deleted successfully', { questionId: question.id });
      return { message: 'Question deleted successfully' };
    } catch (error) {
      logger.error('Error deleting question:', error);
      throw error;
    }
  }

  // Start quiz attempt
  async startQuizAttempt(quizId, studentId, classId) {
    try {
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Check if quiz is published
      if (!quiz.is_published) {
        throw new Error('Quiz is not published');
      }

      // Check if quiz is active
      if (!quiz.is_active) {
        throw new Error('Quiz is not active');
      }

      // Check if quiz has started
      if (quiz.starts_at && new Date() < new Date(quiz.starts_at)) {
        throw new Error('Quiz has not started yet');
      }

      // Check if quiz has ended
      if (quiz.ends_at && new Date() > new Date(quiz.ends_at)) {
        throw new Error('Quiz has already ended');
      }

      // Check if student has already attempted and multiple attempts are not allowed
      if (!quiz.allow_multiple_attempts) {
        const existingAttempt = await QuizAttempt.findOne({
          where: {
            quiz_id: quizId,
            student_id: studentId
          }
        });

        if (existingAttempt && existingAttempt.status === 'completed') {
          throw new Error('You have already completed this quiz');
        }
      }

      // Create or update attempt
      const [attempt, created] = await QuizAttempt.findOrCreate({
        where: {
          quiz_id: quizId,
          student_id: studentId,
          status: 'started'
        },
        defaults: {
          quiz_id: quizId,
          student_id: studentId,
          class_id: classId,
          started_at: new Date(),
          status: 'started',
          total_marks: quiz.total_marks
        }
      });

      if (!created) {
        // Update existing attempt
        await attempt.update({
          started_at: new Date(),
          status: 'started'
        });
      }

      logger.info('Quiz attempt started successfully', { attemptId: attempt.id });
      return attempt;
    } catch (error) {
      logger.error('Error starting quiz attempt:', error);
      throw error;
    }
  }

  // Submit quiz answers
  async submitQuizAnswers(attemptId, answers) {
    try {
      const attempt = await QuizAttempt.findByPk(attemptId);
      if (!attempt) {
        throw new Error('Quiz attempt not found');
      }

      const quiz = await Quiz.findByPk(attempt.quiz_id);
      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Get all questions for the quiz
      const questions = await this.getQuestionsForQuiz(quiz.id);

      // Calculate marks
      let marksObtained = 0;
      const processedAnswers = [];

      for (const answer of answers) {
        const question = questions.find(q => q.id === answer.question_id);
        if (!question) {
          continue;
        }

        let isCorrect = false;

        if (question.question_type === 'mcq') {
          // For MCQ, check if the selected option is correct
          const selectedOption = question.options.find(opt => opt.text === answer.answer);
          isCorrect = selectedOption ? selectedOption.is_correct : false;
        } else {
          // For other question types, check against correct_answer
          isCorrect = answer.answer === question.correct_answer;
        }

        if (isCorrect) {
          marksObtained += parseFloat(question.marks) || 0;
        }

        processedAnswers.push({
          question_id: question.id,
          answer: answer.answer,
          is_correct: isCorrect
        });
      }

      // Calculate percentage
      const percentage = quiz.total_marks > 0 ? (marksObtained / parseFloat(quiz.total_marks)) * 100 : 0;
      const isPassed = percentage >= (parseFloat(quiz.passing_marks) || 0);

      // Update attempt
      await attempt.update({
        completed_at: new Date(),
        time_taken: Math.floor((new Date() - new Date(attempt.started_at)) / 1000), // in seconds
        marks_obtained: marksObtained,
        percentage: percentage,
        status: 'completed',
        is_passed: isPassed,
        answers: processedAnswers
      });

      logger.info('Quiz answers submitted successfully', { attemptId: attempt.id, marksObtained, percentage });
      return attempt;
    } catch (error) {
      logger.error('Error submitting quiz answers:', error);
      throw error;
    }
  }

  // Get quiz attempt by ID
  async getQuizAttemptById(attemptId) {
    try {
      const attempt = await QuizAttempt.findByPk(attemptId, {
        include: [
          {
            model: Quiz,
            attributes: ['id', 'title', 'description', 'total_marks', 'passing_marks']
          },
          {
            model: User,
            as: 'student',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ]
      });

      if (!attempt) {
        throw new Error('Quiz attempt not found');
      }

      return attempt;
    } catch (error) {
      logger.error('Error fetching quiz attempt:', error);
      throw error;
    }
  }

  // Get quiz attempts for a student
  async getQuizAttemptsForStudent(studentId, quizId = null) {
    try {
      const whereClause = {
        student_id: studentId
      };

      if (quizId) {
        whereClause.quiz_id = quizId;
      }

      const attempts = await QuizAttempt.findAll({
        where: whereClause,
        include: [
          {
            model: Quiz,
            attributes: ['id', 'title', 'description', 'total_marks', 'passing_marks']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      return attempts;
    } catch (error) {
      logger.error('Error fetching quiz attempts for student:', error);
      throw error;
    }
  }

  // Get quiz attempts for a teacher
  async getQuizAttemptsForTeacher(teacherId, quizId = null) {
    try {
      // First get quizzes created by this teacher
      const quizzes = await Quiz.findAll({
        where: {
          teacher_id: teacherId
        },
        attributes: ['id']
      });

      let quizIds = quizzes.map(quiz => quiz.id);

      // If specific quizId is provided, check if it belongs to this teacher
      if (quizId) {
        if (!quizIds.includes(quizId)) {
          throw new Error('Quiz not found or does not belong to this teacher');
        }
        quizIds = [quizId];
      }

      const attempts = await QuizAttempt.findAll({
        where: {
          quiz_id: quizIds
        },
        include: [
          {
            model: Quiz,
            attributes: ['id', 'title', 'description', 'total_marks', 'passing_marks']
          },
          {
            model: User,
            as: 'student',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      return attempts;
    } catch (error) {
      logger.error('Error fetching quiz attempts for teacher:', error);
      throw error;
    }
  }

  // Generate MCQs using AI
  async generateMCQs(subjectId, chapterId, topicId, count = 5, difficulty = 'intermediate') {
    try {
      // Get AI-generated MCQs
      const aiContent = await aiService.getTopicMCQs(subjectId, chapterId, topicId, count, difficulty);
      
      // Parse the AI-generated content to extract MCQs
      const mcqs = aiContent.generation_metadata.questions || [];
      
      logger.info('MCQs generated successfully using AI', { subjectId, chapterId, topicId, count });
      return mcqs;
    } catch (error) {
      logger.error('Error generating MCQs:', error);
      throw error;
    }
  }

  // Get quiz analytics
  async getQuizAnalytics(quizId) {
    try {
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz) {
        throw new Error('Quiz not found');
      }

      const attempts = await QuizAttempt.findAll({
        where: {
          quiz_id: quizId
        }
      });

      if (attempts.length === 0) {
        return {
          quizId,
          totalAttempts: 0,
          averageScore: 0,
          passRate: 0,
          highestScore: 0,
          lowestScore: 0
        };
      }

      const totalScores = attempts.reduce((sum, attempt) => sum + (parseFloat(attempt.percentage) || 0), 0);
      const passedAttempts = attempts.filter(attempt => attempt.is_passed).length;
      const scores = attempts.map(attempt => parseFloat(attempt.percentage) || 0);
      
      const analytics = {
        quizId,
        totalAttempts: attempts.length,
        averageScore: totalScores / attempts.length,
        passRate: (passedAttempts / attempts.length) * 100,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        scoreDistribution: this.getScoreDistribution(scores)
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting quiz analytics:', error);
      throw error;
    }
  }

  // Helper function to get score distribution
  getScoreDistribution(scores) {
    const distribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    scores.forEach(score => {
      if (score <= 20) distribution['0-20']++;
      else if (score <= 40) distribution['21-40']++;
      else if (score <= 60) distribution['41-60']++;
      else if (score <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    });

    return distribution;
  }
}

module.exports = new QuizService();