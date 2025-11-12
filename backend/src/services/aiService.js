const AIServiceUtil = require('../utils/aiService');
const { AIContent, Subject } = require('../models');
const logger = require('../config/logger');

class AIService {
  // Generate or retrieve cached topic summary
  async getTopicSummary(subjectId, chapterId, topicId, options = {}) {
    try {
      // Check if we have cached content
      const cachedContent = await AIContent.findOne({
        where: {
          subject_id: subjectId,
          chapter_id: chapterId,
          topic_id: topicId,
          content_type: 'summary',
          is_active: true,
          expires_at: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      if (cachedContent) {
        logger.info('Returning cached topic summary', { subjectId, chapterId, topicId });
        return cachedContent;
      }

      // Get the subject to access its syllabus structure
      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        throw new Error('Subject not found');
      }

      // Find the specific topic in the syllabus
      let topicContent = '';
      let topicTitle = '';
      
      if (subject.syllabus && subject.syllabus.chapters) {
        for (const chapter of subject.syllabus.chapters) {
          if (chapter.id === chapterId && chapter.topics) {
            const topic = chapter.topics.find(t => t.id === topicId);
            if (topic) {
              topicTitle = topic.title;
              // In a real implementation, this would be more detailed content
              topicContent = `Detailed content for topic: ${topic.title}. This is where the comprehensive explanation of the topic would be.`;
              break;
            }
          }
        }
      }

      if (!topicContent) {
        throw new Error('Topic not found in subject syllabus');
      }

      // Generate summary using AI service
      const aiResponse = await AIServiceUtil.generateTopicSummary(topicContent, options);
      
      // Save to cache
      const aiContent = await AIContent.create({
        subject_id: subjectId,
        chapter_id: chapterId,
        topic_id: topicId,
        content_type: 'summary',
        title: topicTitle,
        content: aiResponse.summary,
        keywords: aiResponse.keywords,
        generation_metadata: {
          keyPoints: aiResponse.keyPoints,
          wordCount: aiResponse.wordCount,
          readingTime: aiResponse.readingTime
        },
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        is_cached: true
      });

      logger.info('Generated and cached new topic summary', { subjectId, chapterId, topicId });
      return aiContent;
    } catch (error) {
      logger.error('Error getting topic summary:', error);
      throw error;
    }
  }

  // Generate or retrieve cached topic explanation
  async getTopicExplanation(subjectId, chapterId, topicId, difficulty = 'intermediate') {
    try {
      // Check if we have cached content
      const cachedContent = await AIContent.findOne({
        where: {
          subject_id: subjectId,
          chapter_id: chapterId,
          topic_id: topicId,
          content_type: 'explanation',
          is_active: true,
          expires_at: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      if (cachedContent) {
        logger.info('Returning cached topic explanation', { subjectId, chapterId, topicId });
        return cachedContent;
      }

      // Get the subject to access its syllabus structure
      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        throw new Error('Subject not found');
      }

      // Find the specific topic in the syllabus
      let topicTitle = '';
      let chapterTitle = '';
      
      if (subject.syllabus && subject.syllabus.chapters) {
        for (const chapter of subject.syllabus.chapters) {
          if (chapter.id === chapterId) {
            chapterTitle = chapter.title;
            if (chapter.topics) {
              const topic = chapter.topics.find(t => t.id === topicId);
              if (topic) {
                topicTitle = topic.title;
                break;
              }
            }
          }
        }
      }

      if (!topicTitle) {
        throw new Error('Topic not found in subject syllabus');
      }

      // Generate explanation using AI service
      const context = `Chapter: ${chapterTitle}, Subject: ${subject.name}`;
      const aiResponse = await AIServiceUtil.generateTopicExplanation(topicTitle, context, difficulty);
      
      // Save to cache
      const aiContent = await AIContent.create({
        subject_id: subjectId,
        chapter_id: chapterId,
        topic_id: topicId,
        content_type: 'explanation',
        title: topicTitle,
        content: aiResponse.explanation,
        difficulty_level: difficulty,
        keywords: aiResponse.relatedTopics,
        generation_metadata: {
          examples: aiResponse.examples,
          analogies: aiResponse.analogies,
          relatedTopics: aiResponse.relatedTopics
        },
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        is_cached: true
      });

      logger.info('Generated and cached new topic explanation', { subjectId, chapterId, topicId });
      return aiContent;
    } catch (error) {
      logger.error('Error getting topic explanation:', error);
      throw error;
    }
  }

  // Generate or retrieve cached examples
  async getTopicExamples(subjectId, chapterId, topicId, count = 3) {
    try {
      // Check if we have cached content
      const cachedContent = await AIContent.findOne({
        where: {
          subject_id: subjectId,
          chapter_id: chapterId,
          topic_id: topicId,
          content_type: 'example',
          is_active: true,
          expires_at: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      if (cachedContent) {
        logger.info('Returning cached topic examples', { subjectId, chapterId, topicId });
        return cachedContent;
      }

      // Get the subject to access its syllabus structure
      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        throw new Error('Subject not found');
      }

      // Find the specific topic in the syllabus
      let topicTitle = '';
      
      if (subject.syllabus && subject.syllabus.chapters) {
        for (const chapter of subject.syllabus.chapters) {
          if (chapter.id === chapterId) {
            if (chapter.topics) {
              const topic = chapter.topics.find(t => t.id === topicId);
              if (topic) {
                topicTitle = topic.title;
                break;
              }
            }
          }
        }
      }

      if (!topicTitle) {
        throw new Error('Topic not found in subject syllabus');
      }

      // Generate examples using AI service
      const aiResponse = await AIServiceUtil.generateExamples(topicTitle, count);
      
      // Save to cache
      const aiContent = await AIContent.create({
        subject_id: subjectId,
        chapter_id: chapterId,
        topic_id: topicId,
        content_type: 'example',
        title: topicTitle,
        content: aiResponse.examples.join('\n\n'),
        keywords: this.extractKeywords(aiResponse.examples.join(' ')),
        generation_metadata: {
          exampleCount: count
        },
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        is_cached: true
      });

      logger.info('Generated and cached new topic examples', { subjectId, chapterId, topicId });
      return aiContent;
    } catch (error) {
      logger.error('Error getting topic examples:', error);
      throw error;
    }
  }

  // Generate or retrieve cached MCQs
  async getTopicMCQs(subjectId, chapterId, topicId, count = 5, difficulty = 'intermediate') {
    try {
      // Check if we have cached content
      const cachedContent = await AIContent.findOne({
        where: {
          subject_id: subjectId,
          chapter_id: chapterId,
          topic_id: topicId,
          content_type: 'exercise',
          is_active: true,
          expires_at: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      if (cachedContent) {
        logger.info('Returning cached topic MCQs', { subjectId, chapterId, topicId });
        return cachedContent;
      }

      // Get the subject to access its syllabus structure
      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        throw new Error('Subject not found');
      }

      // Find the specific topic in the syllabus
      let topicTitle = '';
      
      if (subject.syllabus && subject.syllabus.chapters) {
        for (const chapter of subject.syllabus.chapters) {
          if (chapter.id === chapterId) {
            if (chapter.topics) {
              const topic = chapter.topics.find(t => t.id === topicId);
              if (topic) {
                topicTitle = topic.title;
                break;
              }
            }
          }
        }
      }

      if (!topicTitle) {
        throw new Error('Topic not found in subject syllabus');
      }

      // Generate MCQs using AI service
      const aiResponse = await AIServiceUtil.generateMCQs(topicTitle, count, difficulty);
      
      // Format MCQs for storage
      const formattedContent = aiResponse.mcqs.map((mcq, index) => {
        return `Question ${index + 1}: ${mcq.question}\n` +
               `Options: ${mcq.options.join(', ')}\n` +
               `Correct Answer: ${mcq.correctAnswer}\n` +
               `Explanation: ${mcq.explanation}`;
      }).join('\n\n');

      // Save to cache
      const aiContent = await AIContent.create({
        subject_id: subjectId,
        chapter_id: chapterId,
        topic_id: topicId,
        content_type: 'exercise',
        title: `${topicTitle} - Practice Questions`,
        content: formattedContent,
        difficulty_level: difficulty,
        keywords: this.extractKeywords(formattedContent),
        generation_metadata: {
          questionCount: count,
          questions: aiResponse.mcqs
        },
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        is_cached: true
      });

      logger.info('Generated and cached new topic MCQs', { subjectId, chapterId, topicId });
      return aiContent;
    } catch (error) {
      logger.error('Error getting topic MCQs:', error);
      throw error;
    }
  }

  // New method for analyzing draft content
  async analyzeDraft(draftContent, draftType = 'essay') {
    try {
      const processedContent = AIServiceUtil.preprocessText(draftContent);
      const stats = AIServiceUtil.getTextStatistics(processedContent);
      const keywords = AIServiceUtil.extractKeywords(processedContent);
      
      // Get plagiarism check
      const plagiarismResult = await AIServiceUtil.checkPlagiarism(processedContent);
      
      // Get grammar and clarity scores
      const grammarScore = this.calculateGrammarScore(processedContent);
      const clarityScore = this.calculateClarityScore(processedContent);
      const coherenceScore = this.calculateCoherenceScore(processedContent);
      const originalityScore = 100 - plagiarismResult.score;
      
      // Overall analysis score
      const analysisScore = (
        grammarScore * 0.25 + 
        clarityScore * 0.25 + 
        coherenceScore * 0.25 + 
        originalityScore * 0.25
      );
      
      return {
        analysisScore: parseFloat(analysisScore.toFixed(2)),
        grammarScore: parseFloat(grammarScore.toFixed(2)),
        clarityScore: parseFloat(clarityScore.toFixed(2)),
        coherenceScore: parseFloat(coherenceScore.toFixed(2)),
        originalityScore: parseFloat(originalityScore.toFixed(2)),
        plagiarismScore: parseFloat(plagiarismResult.score.toFixed(2)),
        statistics: stats,
        keywords: keywords,
        plagiarismSources: plagiarismResult.sources
      };
    } catch (error) {
      logger.error('Error analyzing draft:', error);
      throw error;
    }
  }

  // New method for generating draft feedback
  async generateDraftFeedback(draftContent, draftType = 'essay') {
    try {
      const processedContent = AIServiceUtil.preprocessText(draftContent);
      
      // Get feedback from AI service utility
      const feedbackResult = await AIServiceUtil.generateFeedback(processedContent);
      
      return {
        feedback: feedbackResult.feedback,
        suggestions: feedbackResult.suggestions,
        statistics: feedbackResult.statistics
      };
    } catch (error) {
      logger.error('Error generating draft feedback:', error);
      throw error;
    }
  }

  // New method for generating improvement suggestions
  async generateImprovementSuggestions(draftContent, draftType = 'essay', focusAreas = []) {
    try {
      const processedContent = AIServiceUtil.preprocessText(draftContent);
      
      // Generate improvement suggestions
      const suggestions = [];
      
      // Grammar suggestions
      if (focusAreas.includes('grammar') || focusAreas.length === 0) {
        suggestions.push({
          area: 'grammar',
          title: 'Grammar Improvements',
          suggestions: [
            'Review sentence structures for grammatical correctness',
            'Check subject-verb agreement throughout the document',
            'Ensure proper punctuation usage'
          ]
        });
      }
      
      // Clarity suggestions
      if (focusAreas.includes('clarity') || focusAreas.length === 0) {
        suggestions.push({
          area: 'clarity',
          title: 'Clarity Enhancements',
          suggestions: [
            'Break down complex sentences into simpler ones',
            'Define technical terms for better understanding',
            'Use active voice instead of passive voice where possible'
          ]
        });
      }
      
      // Structure suggestions
      if (focusAreas.includes('structure') || focusAreas.length === 0) {
        suggestions.push({
          area: 'structure',
          title: 'Structure Improvements',
          suggestions: [
            'Ensure a clear introduction, body, and conclusion',
            'Use topic sentences at the beginning of paragraphs',
            'Maintain logical flow between ideas'
          ]
        });
      }
      
      // Vocabulary suggestions
      if (focusAreas.includes('vocabulary') || focusAreas.length === 0) {
        suggestions.push({
          area: 'vocabulary',
          title: 'Vocabulary Enhancement',
          suggestions: [
            'Replace repetitive words with synonyms',
            'Use more precise vocabulary where appropriate',
            'Avoid informal language in academic writing'
          ]
        });
      }
      
      return suggestions;
    } catch (error) {
      logger.error('Error generating improvement suggestions:', error);
      throw error;
    }
  }

  // Helper method to calculate grammar score
  calculateGrammarScore(content) {
    // In a real implementation, this would use a grammar checking library
    // For now, we'll simulate a grammar score based on content characteristics
    const stats = AIServiceUtil.getTextStatistics(content);
    
    // Simple heuristic for grammar score
    let score = 100;
    
    // Deduct points for very short or very long sentences
    if (stats.avgWordsPerSentence < 5) {
      score -= 10;
    } else if (stats.avgWordsPerSentence > 25) {
      score -= 15;
    }
    
    // Deduct points for lack of sentence variety
    if (stats.sentenceCount < 3) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Helper method to calculate clarity score
  calculateClarityScore(content) {
    // In a real implementation, this would use NLP techniques
    // For now, we'll simulate a clarity score based on content characteristics
    const stats = AIServiceUtil.getTextStatistics(content);
    const keywords = AIServiceUtil.extractKeywords(content);
    
    // Simple heuristic for clarity score
    let score = 100;
    
    // Deduct points for lack of paragraphs
    if (stats.paragraphCount < 2) {
      score -= 20;
    }
    
    // Deduct points for very long paragraphs
    if (stats.paragraphCount > 0 && stats.wordCount / stats.paragraphCount > 200) {
      score -= 10;
    }
    
    // Deduct points for lack of keywords (indicates vague content)
    if (keywords.length < 3) {
      score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Helper method to calculate coherence score
  calculateCoherenceScore(content) {
    // In a real implementation, this would analyze logical connections
    // For now, we'll simulate a coherence score based on structure
    const stats = AIServiceUtil.getTextStatistics(content);
    
    // Simple heuristic for coherence score
    let score = 100;
    
    // Deduct points for lack of structure
    if (stats.paragraphCount < 2) {
      score -= 30;
    }
    
    // Deduct points for insufficient content
    if (stats.wordCount < 50) {
      score -= 25;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Extract keywords from text
  extractKeywords(text, count = 5) {
    // Simple keyword extraction (in a real implementation, this would use NLP libraries)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3); // Only consider words longer than 3 characters
    
    // Count word frequencies
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Sort by frequency and return top keywords
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([word]) => word);
  }

  // Get all AI content for a subject
  async getSubjectAIContent(subjectId) {
    try {
      const aiContent = await AIContent.findAll({
        where: {
          subject_id: subjectId,
          is_active: true
        },
        order: [['created_at', 'DESC']]
      });

      return aiContent;
    } catch (error) {
      logger.error('Error getting subject AI content:', error);
      throw error;
    }
  }

  // Delete expired cached content
  async cleanupExpiredContent() {
    try {
      const deletedCount = await AIContent.destroy({
        where: {
          expires_at: {
            [require('sequelize').Op.lt]: new Date()
          }
        }
      });

      logger.info(`Cleaned up ${deletedCount} expired AI content records`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired content:', error);
      throw error;
    }
  }

  // Assess quality of generated content
  async assessContentQuality(contentId) {
    try {
      const aiContent = await AIContent.findByPk(contentId);
      if (!aiContent) {
        throw new Error('AI content not found');
      }

      const qualityAssessment = await AIServiceUtil.assessQuality(aiContent.content);
      
      // Update quality score
      await aiContent.update({
        quality_score: qualityAssessment.qualityScore
      });

      return {
        ...qualityAssessment,
        contentId: aiContent.id
      };
    } catch (error) {
      logger.error('Error assessing content quality:', error);
      throw error;
    }
  }
}

module.exports = new AIService();