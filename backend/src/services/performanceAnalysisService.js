const { StudentPerformance, QuizAttempt, Question, Quiz, Subject } = require('../models');
const logger = require('../config/logger');

class PerformanceAnalysisService {
  // Analyze student performance based on quiz attempts
  async analyzeStudentPerformance(studentId, subjectId) {
    try {
      // Get all quiz attempts for this student in this subject
      const quizAttempts = await QuizAttempt.findAll({
        where: {
          student_id: studentId
        },
        include: [{
          model: Quiz,
          where: {
            subject_id: subjectId
          },
          include: [{
            model: Question
          }]
        }]
      });

      if (quizAttempts.length === 0) {
        return {
          studentId,
          subjectId,
          overallPerformance: 0,
          topics: []
        };
      }

      // Get subject details to access syllabus structure
      const subject = await Subject.findByPk(subjectId);
      if (!subject || !subject.syllabus) {
        throw new Error('Subject not found or missing syllabus');
      }

      // Analyze performance by topic
      const topicPerformance = this.analyzePerformanceByTopic(quizAttempts, subject.syllabus);
      
      // Calculate overall performance
      const overallPerformance = this.calculateOverallPerformance(quizAttempts);
      
      // Identify weak topics
      const weakTopics = this.identifyWeakTopics(topicPerformance);
      
      // Update or create performance records
      await this.updateStudentPerformanceRecords(studentId, subjectId, topicPerformance);

      return {
        studentId,
        subjectId,
        overallPerformance,
        topicPerformance,
        weakTopics
      };
    } catch (error) {
      logger.error('Error analyzing student performance:', error);
      throw error;
    }
  }

  // Analyze performance by topic
  analyzePerformanceByTopic(quizAttempts, syllabus) {
    const topicStats = {};

    // Initialize topic stats based on syllabus structure
    if (syllabus.chapters) {
      syllabus.chapters.forEach(chapter => {
        if (chapter.topics) {
          chapter.topics.forEach(topic => {
            topicStats[topic.id] = {
              topicId: topic.id,
              topicName: topic.title,
              chapterId: chapter.id,
              chapterName: chapter.title,
              totalAttempts: 0,
              correctAttempts: 0,
              accuracyRate: 0,
              totalTime: 0,
              averageTime: 0,
              questionsAttempted: 0
            };
          });
        }
      });
    }

    // Process quiz attempts to calculate topic performance
    quizAttempts.forEach(attempt => {
      if (attempt.answers && Array.isArray(attempt.answers)) {
        attempt.answers.forEach(answer => {
          // Find the question to get topic information
          const question = attempt.Quiz.Questions.find(q => q.id === answer.question_id);
          if (question && question.topic_id) {
            const topicId = question.topic_id;
            if (topicStats[topicId]) {
              topicStats[topicId].totalAttempts += 1;
              if (answer.is_correct) {
                topicStats[topicId].correctAttempts += 1;
              }
              topicStats[topicId].questionsAttempted += 1;
            }
          }
        });
      }
      
      // Add time data if available
      if (attempt.time_taken) {
        // Distribute time across topics (simplified approach)
        const topicsInAttempt = Object.keys(topicStats).length;
        if (topicsInAttempt > 0) {
          const timePerTopic = attempt.time_taken / topicsInAttempt;
          Object.keys(topicStats).forEach(topicId => {
            topicStats[topicId].totalTime += timePerTopic;
          });
        }
      }
    });

    // Calculate accuracy rates and averages
    Object.keys(topicStats).forEach(topicId => {
      const stats = topicStats[topicId];
      if (stats.totalAttempts > 0) {
        stats.accuracyRate = (stats.correctAttempts / stats.totalAttempts) * 100;
      }
      if (stats.questionsAttempted > 0) {
        stats.averageTime = stats.totalTime / stats.questionsAttempted;
      }
    });

    return Object.values(topicStats);
  }

  // Calculate overall performance
  calculateOverallPerformance(quizAttempts) {
    if (quizAttempts.length === 0) return 0;
    
    const totalPercentage = quizAttempts.reduce((sum, attempt) => {
      return sum + (parseFloat(attempt.percentage) || 0);
    }, 0);
    
    return totalPercentage / quizAttempts.length;
  }

  // Identify weak topics based on performance thresholds
  identifyWeakTopics(topicPerformance) {
    return topicPerformance.filter(topic => {
      // Topic is considered weak if:
      // 1. Accuracy rate is below 70%
      // 2. And the topic has been attempted at least 3 times
      return topic.accuracyRate < 70 && topic.totalAttempts >= 3;
    }).map(topic => ({
      topicId: topic.topicId,
      topicName: topic.topicName,
      accuracyRate: topic.accuracyRate,
      weaknessLevel: this.determineWeaknessLevel(topic.accuracyRate)
    }));
  }

  // Determine weakness level based on accuracy rate
  determineWeaknessLevel(accuracyRate) {
    if (accuracyRate < 50) return 'severe';
    if (accuracyRate < 70) return 'moderate';
    return 'mild';
  }

  // Update or create student performance records
  async updateStudentPerformanceRecords(studentId, subjectId, topicPerformance) {
    try {
      for (const topic of topicPerformance) {
        // Find existing performance record or create new one
        const [performanceRecord, created] = await StudentPerformance.findOrCreate({
          where: {
            student_id: studentId,
            subject_id: subjectId,
            topic_id: topic.topicId
          },
          defaults: {
            student_id: studentId,
            subject_id: subjectId,
            chapter_id: topic.chapterId,
            topic_id: topic.topicId,
            total_attempts: 0,
            correct_attempts: 0,
            accuracy_rate: 0.00,
            is_active: true
          }
        });

        // Update performance metrics
        const updatedAttempts = performanceRecord.total_attempts + topic.totalAttempts;
        const updatedCorrect = performanceRecord.correct_attempts + topic.correctAttempts;
        const updatedAccuracy = updatedAttempts > 0 ? (updatedCorrect / updatedAttempts) * 100 : 0;
        
        // Determine if this is a weak topic
        const isWeak = updatedAccuracy < 70 && updatedAttempts >= 3;
        const weaknessLevel = this.determineWeaknessLevel(updatedAccuracy);

        await performanceRecord.update({
          total_attempts: updatedAttempts,
          correct_attempts: updatedCorrect,
          accuracy_rate: updatedAccuracy,
          average_time_per_question: topic.averageTime || null,
          is_weak_topic: isWeak,
          weakness_level: isWeak ? weaknessLevel : 'mild',
          last_assessed_at: new Date(),
          performance_details: {
            topicName: topic.topicName,
            chapterName: topic.chapterName,
            questionsAttempted: topic.questionsAttempted,
            totalTime: topic.totalTime
          }
        });
      }
    } catch (error) {
      logger.error('Error updating student performance records:', error);
      throw error;
    }
  }

  // Get detailed performance analysis for a student
  async getStudentPerformanceAnalysis(studentId, subjectId) {
    try {
      // Get all performance records for this student in this subject
      const performanceRecords = await StudentPerformance.findAll({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          is_active: true
        },
        order: [['accuracy_rate', 'ASC']]
      });

      // Calculate overall statistics
      const totalRecords = performanceRecords.length;
      const weakTopics = performanceRecords.filter(record => record.is_weak_topic);
      const averageAccuracy = totalRecords > 0 
        ? performanceRecords.reduce((sum, record) => sum + parseFloat(record.accuracy_rate), 0) / totalRecords
        : 0;

      return {
        studentId,
        subjectId,
        totalTopics: totalRecords,
        weakTopicsCount: weakTopics.length,
        averageAccuracy: parseFloat(averageAccuracy.toFixed(2)),
        performanceRecords: performanceRecords.map(record => ({
          topicId: record.topic_id,
          chapterId: record.chapter_id,
          accuracyRate: parseFloat(record.accuracy_rate),
          totalAttempts: record.total_attempts,
          isWeakTopic: record.is_weak_topic,
          weaknessLevel: record.weakness_level,
          lastAssessed: record.last_assessed_at,
          performanceDetails: record.performance_details
        })),
        weakTopics: weakTopics.map(record => ({
          topicId: record.topic_id,
          accuracyRate: parseFloat(record.accuracy_rate),
          weaknessLevel: record.weakness_level,
          performanceDetails: record.performance_details
        }))
      };
    } catch (error) {
      logger.error('Error getting student performance analysis:', error);
      throw error;
    }
  }

  // Advanced weak topic detection using multiple factors
  async detectWeakTopicsAdvanced(studentId, subjectId) {
    try {
      // Get performance records
      const performanceRecords = await StudentPerformance.findAll({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          is_active: true
        }
      });

      // Apply advanced detection algorithms
      const weakTopics = performanceRecords.filter(record => {
        // Multiple criteria for weak topic detection:
        const accuracyRate = parseFloat(record.accuracy_rate);
        const totalAttempts = record.total_attempts;
        
        // 1. Low accuracy with sufficient attempts
        const lowAccuracy = accuracyRate < 70 && totalAttempts >= 3;
        
        // 2. Declining performance trend (simplified)
        // In a real implementation, this would compare with historical data
        
        // 3. High time consumption with low accuracy
        const slowPerformance = record.average_time_per_question > 60 && accuracyRate < 70;
        
        return lowAccuracy || slowPerformance;
      });

      // Categorize weak topics by severity
      const categorizedWeakness = {
        severe: [],
        moderate: [],
        mild: []
      };

      weakTopics.forEach(record => {
        const accuracyRate = parseFloat(record.accuracy_rate);
        let category = 'mild';
        
        if (accuracyRate < 50) {
          category = 'severe';
        } else if (accuracyRate < 70) {
          category = 'moderate';
        }
        
        categorizedWeakness[category].push({
          topicId: record.topic_id,
          accuracyRate: accuracyRate,
          totalAttempts: record.total_attempts,
          averageTime: record.average_time_per_question,
          weaknessLevel: category
        });
      });

      return categorizedWeakness;
    } catch (error) {
      logger.error('Error in advanced weak topic detection:', error);
      throw error;
    }
  }

  // Get performance trends over time
  async getPerformanceTrends(studentId, subjectId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get recent performance records
      const recentRecords = await StudentPerformance.findAll({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          is_active: true,
          updated_at: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        order: [['updated_at', 'ASC']]
      });

      // Group by date and calculate daily averages
      const dailyPerformance = {};
      
      recentRecords.forEach(record => {
        const date = record.updated_at.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!dailyPerformance[date]) {
          dailyPerformance[date] = {
            date: date,
            totalTopics: 0,
            totalAccuracy: 0,
            weakTopics: 0
          };
        }
        
        dailyPerformance[date].totalTopics += 1;
        dailyPerformance[date].totalAccuracy += parseFloat(record.accuracy_rate);
        if (record.is_weak_topic) {
          dailyPerformance[date].weakTopics += 1;
        }
      });

      // Calculate averages
      const trends = Object.values(dailyPerformance).map(day => ({
        date: day.date,
        averageAccuracy: day.totalTopics > 0 ? day.totalAccuracy / day.totalTopics : 0,
        weakTopicsCount: day.weakTopics,
        totalTopics: day.totalTopics
      }));

      return trends;
    } catch (error) {
      logger.error('Error getting performance trends:', error);
      throw error;
    }
  }
}

module.exports = new PerformanceAnalysisService();