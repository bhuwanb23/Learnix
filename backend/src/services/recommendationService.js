const { StudentPerformance, Subject, AIContent } = require('../models');
const aiService = require('./aiService');
const logger = require('../config/logger');

class RecommendationService {
  // Generate personalized study recommendations
  async generateStudyRecommendations(studentId, subjectId) {
    try {
      // Get student's weak topics
      const weakTopics = await this.getStudentWeakTopics(studentId, subjectId);
      
      // Get subject details
      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        throw new Error('Subject not found');
      }

      // Generate recommendations for each weak topic
      const recommendations = [];
      
      for (const weakTopic of weakTopics) {
        const recommendation = await this.generateTopicRecommendation(
          studentId, 
          subjectId, 
          weakTopic.topicId, 
          weakTopic.weaknessLevel
        );
        recommendations.push(recommendation);
      }

      // Generate overall study plan
      const studyPlan = await this.generateStudyPlan(studentId, subjectId, weakTopics);

      return {
        studentId,
        subjectId,
        subjectName: subject.name,
        recommendations,
        studyPlan,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating study recommendations:', error);
      throw error;
    }
  }

  // Get student's weak topics
  async getStudentWeakTopics(studentId, subjectId) {
    try {
      const weakRecords = await StudentPerformance.findAll({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          is_weak_topic: true,
          is_active: true
        },
        order: [['accuracy_rate', 'ASC']]
      });

      return weakRecords.map(record => ({
        topicId: record.topic_id,
        chapterId: record.chapter_id,
        accuracyRate: parseFloat(record.accuracy_rate),
        weaknessLevel: record.weakness_level,
        lastAssessed: record.last_assessed_at
      }));
    } catch (error) {
      logger.error('Error getting student weak topics:', error);
      throw error;
    }
  }

  // Generate recommendation for a specific topic
  async generateTopicRecommendation(studentId, subjectId, topicId, weaknessLevel) {
    try {
      // Get topic details from subject syllabus
      const subject = await Subject.findByPk(subjectId);
      if (!subject || !subject.syllabus) {
        throw new Error('Subject not found or missing syllabus');
      }

      let topicDetails = null;
      let chapterDetails = null;
      
      if (subject.syllabus.chapters) {
        for (const chapter of subject.syllabus.chapters) {
          if (chapter.topics) {
            const topic = chapter.topics.find(t => t.id === topicId);
            if (topic) {
              topicDetails = topic;
              chapterDetails = chapter;
              break;
            }
          }
        }
      }

      if (!topicDetails) {
        throw new Error('Topic not found in subject syllabus');
      }

      // Get AI-generated content for this topic
      const aiContent = await this.getAIContentForTopic(subjectId, chapterDetails.id, topicId);

      // Determine recommendation priority based on weakness level
      const priority = this.getRecommendationPriority(weaknessLevel);

      return {
        topicId: topicId,
        topicName: topicDetails.title,
        chapterId: chapterDetails.id,
        chapterName: chapterDetails.title,
        weaknessLevel: weaknessLevel,
        priority: priority,
        recommendedActions: this.getRecommendedActions(weaknessLevel),
        aiContent: aiContent,
        estimatedTime: this.estimateStudyTime(weaknessLevel),
        confidenceBoosters: this.getConfidenceBoosters(weaknessLevel)
      };
    } catch (error) {
      logger.error('Error generating topic recommendation:', error);
      throw error;
    }
  }

  // Get AI content for a topic
  async getAIContentForTopic(subjectId, chapterId, topicId) {
    try {
      // Try to get existing AI content
      const existingContent = await AIContent.findOne({
        where: {
          subject_id: subjectId,
          chapter_id: chapterId,
          topic_id: topicId,
          is_active: true
        }
      });

      if (existingContent) {
        return {
          summary: existingContent.content_type === 'summary' ? existingContent.content : null,
          explanation: existingContent.content_type === 'explanation' ? existingContent.content : null,
          examples: existingContent.content_type === 'example' ? existingContent.content : null
        };
      }

      // If no existing content, we could generate new content using AI service
      // For now, return mock data
      return {
        summary: `Summary for topic ${topicId}`,
        explanation: `Detailed explanation for topic ${topicId}`,
        examples: `Examples for topic ${topicId}`
      };
    } catch (error) {
      logger.error('Error getting AI content for topic:', error);
      // Return mock data if there's an error
      return {
        summary: `Summary for topic ${topicId}`,
        explanation: `Detailed explanation for topic ${topicId}`,
        examples: `Examples for topic ${topicId}`
      };
    }
  }

  // Get recommendation priority based on weakness level
  getRecommendationPriority(weaknessLevel) {
    switch (weaknessLevel) {
      case 'severe': return 'high';
      case 'moderate': return 'medium';
      case 'mild': return 'low';
      default: return 'medium';
    }
  }

  // Get recommended actions based on weakness level
  getRecommendedActions(weaknessLevel) {
    switch (weaknessLevel) {
      case 'severe':
        return [
          'Review fundamental concepts',
          'Practice with basic examples',
          'Watch video explanations',
          'Ask teacher for additional help',
          'Form study group with classmates'
        ];
      case 'moderate':
        return [
          'Review topic summary',
          'Practice more questions',
          'Focus on weak areas',
          'Use flashcards for memorization'
        ];
      case 'mild':
        return [
          'Quick review of key points',
          'Attempt a few practice questions',
          'Clarify any doubts'
        ];
      default:
        return ['Review topic content'];
    }
  }

  // Estimate study time based on weakness level
  estimateStudyTime(weaknessLevel) {
    switch (weaknessLevel) {
      case 'severe': return 120; // 2 hours
      case 'moderate': return 60; // 1 hour
      case 'mild': return 30; // 30 minutes
      default: return 45; // 45 minutes
    }
  }

  // Get confidence boosters based on weakness level
  getConfidenceBoosters(weaknessLevel) {
    switch (weaknessLevel) {
      case 'severe':
        return [
          'Start with easiest concepts',
          'Celebrate small wins',
          'Use visual learning aids',
          'Take regular breaks',
          'Track progress daily'
        ];
      case 'moderate':
        return [
          'Set achievable goals',
          'Use active recall techniques',
          'Practice with timers',
          'Review mistakes thoroughly'
        ];
      case 'mild':
        return [
          'Quick self-assessment',
          'Peer discussion',
          'Teach concept to someone else'
        ];
      default:
        return ['Stay consistent', 'Ask questions when in doubt'];
    }
  }

  // Generate overall study plan
  async generateStudyPlan(studentId, subjectId, weakTopics) {
    try {
      // Sort topics by priority (severe first)
      const sortedTopics = [...weakTopics].sort((a, b) => {
        const priorityOrder = { 'severe': 1, 'moderate': 2, 'mild': 3 };
        return priorityOrder[a.weaknessLevel] - priorityOrder[b.weaknessLevel];
      });

      // Create study schedule
      const schedule = [];
      let currentDate = new Date();
      
      // Allocate time for each topic based on weakness level
      for (const topic of sortedTopics) {
        const studyTime = this.estimateStudyTime(topic.weaknessLevel);
        
        schedule.push({
          topicId: topic.topicId,
          topicName: await this.getTopicName(subjectId, topic.topicId),
          date: new Date(currentDate),
          estimatedTime: studyTime,
          weaknessLevel: topic.weaknessLevel,
          priority: this.getRecommendationPriority(topic.weaknessLevel)
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        startDate: new Date(),
        endDate: schedule.length > 0 ? schedule[schedule.length - 1].date : new Date(),
        totalTopics: sortedTopics.length,
        totalEstimatedTime: schedule.reduce((sum, item) => sum + item.estimatedTime, 0),
        schedule: schedule
      };
    } catch (error) {
      logger.error('Error generating study plan:', error);
      throw error;
    }
  }

  // Get topic name from subject syllabus
  async getTopicName(subjectId, topicId) {
    try {
      const subject = await Subject.findByPk(subjectId);
      if (!subject || !subject.syllabus || !subject.syllabus.chapters) {
        return `Topic ${topicId}`;
      }

      for (const chapter of subject.syllabus.chapters) {
        if (chapter.topics) {
          const topic = chapter.topics.find(t => t.id === topicId);
          if (topic) {
            return topic.title;
          }
        }
      }

      return `Topic ${topicId}`;
    } catch (error) {
      logger.error('Error getting topic name:', error);
      return `Topic ${topicId}`;
    }
  }

  // Get intervention suggestions for weak topics
  async getInterventionSuggestions(studentId, subjectId) {
    try {
      const weakTopics = await this.getStudentWeakTopics(studentId, subjectId);
      
      const interventions = weakTopics.map(topic => ({
        topicId: topic.topicId,
        topicName: topic.topicId, // Will be updated with actual name
        weaknessLevel: topic.weaknessLevel,
        suggestedIntervention: this.getSuggestedIntervention(topic.weaknessLevel),
        urgency: this.getInterventionUrgency(topic.weaknessLevel),
        resources: this.getSuggestedResources(topic.weaknessLevel)
      }));

      // Update topic names
      for (const intervention of interventions) {
        intervention.topicName = await this.getTopicName(subjectId, intervention.topicId);
      }

      return interventions;
    } catch (error) {
      logger.error('Error getting intervention suggestions:', error);
      throw error;
    }
  }

  // Get suggested intervention based on weakness level
  getSuggestedIntervention(weaknessLevel) {
    switch (weaknessLevel) {
      case 'severe':
        return 'Immediate one-on-one tutoring session recommended';
      case 'moderate':
        return 'Additional practice exercises and peer study group';
      case 'mild':
        return 'Self-study with regular check-ins';
      default:
        return 'Regular review and practice';
    }
  }

  // Get intervention urgency based on weakness level
  getInterventionUrgency(weaknessLevel) {
    switch (weaknessLevel) {
      case 'severe': return 'high';
      case 'moderate': return 'medium';
      case 'mild': return 'low';
      default: return 'medium';
    }
  }

  // Get suggested resources based on weakness level
  getSuggestedResources(weaknessLevel) {
    switch (weaknessLevel) {
      case 'severe':
        return [
          'Video tutorials',
          'Interactive simulations',
          'Step-by-step guides',
          'One-on-one tutoring',
          'Practice worksheets'
        ];
      case 'moderate':
        return [
          'Practice quizzes',
          'Flashcards',
          'Study guides',
          'Peer discussion forums'
        ];
      case 'mild':
        return [
          'Quick review sheets',
          'Self-assessment quizzes',
          'Summary notes'
        ];
      default:
        return ['Textbook readings', 'Class notes'];
    }
  }

  // Generate adaptive study plan based on progress
  async generateAdaptiveStudyPlan(studentId, subjectId, preferences = {}) {
    try {
      // Get student's current performance
      const performance = await this.getStudentPerformanceOverview(studentId, subjectId);
      
      // Get weak topics
      const weakTopics = await this.getStudentWeakTopics(studentId, subjectId);
      
      // Get strong topics for review
      const strongTopics = await this.getStudentStrongTopics(studentId, subjectId);
      
      // Create personalized schedule
      const schedule = await this.createPersonalizedSchedule(
        studentId, 
        subjectId, 
        weakTopics, 
        strongTopics, 
        preferences
      );

      return {
        studentId,
        subjectId,
        performanceOverview: performance,
        weakTopicsCount: weakTopics.length,
        strongTopicsCount: strongTopics.length,
        adaptivePlan: schedule,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating adaptive study plan:', error);
      throw error;
    }
  }

  // Get student performance overview
  async getStudentPerformanceOverview(studentId, subjectId) {
    try {
      const records = await StudentPerformance.findAll({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          is_active: true
        }
      });

      if (records.length === 0) {
        return {
          overallAccuracy: 0,
          totalTopics: 0,
          weakTopics: 0,
          strongTopics: 0
        };
      }

      const totalAccuracy = records.reduce((sum, record) => sum + parseFloat(record.accuracy_rate), 0);
      const overallAccuracy = totalAccuracy / records.length;
      
      const weakTopics = records.filter(record => record.is_weak_topic).length;
      const strongTopics = records.filter(record => parseFloat(record.accuracy_rate) >= 85).length;

      return {
        overallAccuracy: parseFloat(overallAccuracy.toFixed(2)),
        totalTopics: records.length,
        weakTopics: weakTopics,
        strongTopics: strongTopics
      };
    } catch (error) {
      logger.error('Error getting student performance overview:', error);
      throw error;
    }
  }

  // Get student's strong topics
  async getStudentStrongTopics(studentId, subjectId) {
    try {
      const strongRecords = await StudentPerformance.findAll({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          is_active: true,
          accuracy_rate: {
            [require('sequelize').Op.gte]: 85
          }
        },
        order: [['accuracy_rate', 'DESC']]
      });

      return strongRecords.map(record => ({
        topicId: record.topic_id,
        chapterId: record.chapter_id,
        accuracyRate: parseFloat(record.accuracy_rate),
        lastAssessed: record.last_assessed_at
      }));
    } catch (error) {
      logger.error('Error getting student strong topics:', error);
      throw error;
    }
  }

  // Create personalized schedule
  async createPersonalizedSchedule(studentId, subjectId, weakTopics, strongTopics, preferences) {
    try {
      // Get student's available study time
      const availableTime = preferences.studyHoursPerDay || 2;
      const studyDays = preferences.studyDays || 7;
      
      // Create schedule structure
      const schedule = [];
      let currentDate = new Date();
      
      // Mix weak and strong topics for balanced learning
      const topicsToStudy = [
        ...weakTopics.map(topic => ({ ...topic, type: 'weak' })),
        ...strongTopics.map(topic => ({ ...topic, type: 'review' }))
      ];
      
      // Sort by priority: weak topics first, then reviews
      topicsToStudy.sort((a, b) => {
        if (a.type === 'weak' && b.type !== 'weak') return -1;
        if (a.type !== 'weak' && b.type === 'weak') return 1;
        return parseFloat(b.accuracyRate) - parseFloat(a.accuracyRate);
      });
      
      // Distribute topics across study days
      for (let day = 0; day < studyDays && topicsToStudy.length > 0; day++) {
        const dailyTopics = [];
        let remainingTime = availableTime * 60; // Convert to minutes
        
        // Add topics for this day
        while (remainingTime > 0 && topicsToStudy.length > 0) {
          const topic = topicsToStudy.shift();
          const estimatedTime = topic.type === 'weak' 
            ? this.estimateStudyTime(topic.weaknessLevel || 'moderate')
            : 20; // 20 minutes for review
            
          if (estimatedTime <= remainingTime) {
            dailyTopics.push({
              topicId: topic.topicId,
              topicName: await this.getTopicName(subjectId, topic.topicId),
              type: topic.type,
              estimatedTime: estimatedTime,
              weaknessLevel: topic.weaknessLevel || 'review'
            });
            
            remainingTime -= estimatedTime;
          } else {
            // Put the topic back for next day
            topicsToStudy.unshift(topic);
            break;
          }
        }
        
        if (dailyTopics.length > 0) {
          schedule.push({
            date: new Date(currentDate),
            topics: dailyTopics,
            totalEstimatedTime: dailyTopics.reduce((sum, topic) => sum + topic.estimatedTime, 0)
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return {
        startDate: new Date(),
        endDate: schedule.length > 0 ? schedule[schedule.length - 1].date : new Date(),
        totalDays: schedule.length,
        totalTopics: topicsToStudy.length,
        dailySchedule: schedule
      };
    } catch (error) {
      logger.error('Error creating personalized schedule:', error);
      throw error;
    }
  }
}

module.exports = new RecommendationService();