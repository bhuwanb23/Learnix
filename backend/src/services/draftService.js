const { Draft, User, Subject, Assignment, Course, Class } = require('../models');
const AIService = require('./aiService');
const logger = require('../config/logger');

class DraftService {
  // Create a new draft
  async createDraft(draftData) {
    try {
      // Calculate text statistics
      const stats = this.calculateTextStatistics(draftData.content);
      
      const draft = await Draft.create({
        ...draftData,
        word_count: stats.wordCount,
        character_count: draftData.content.length
      });
      
      logger.info('Draft created successfully', { draftId: draft.id });
      return draft;
    } catch (error) {
      logger.error('Error creating draft:', error);
      throw error;
    }
  }

  // Get draft by ID
  async getDraftById(draftId) {
    try {
      const draft = await Draft.findByPk(draftId, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'first_name', 'last_name', 'email']
          },
          {
            model: Subject,
            attributes: ['id', 'name']
          },
          {
            model: Assignment,
            attributes: ['id', 'title']
          },
          {
            model: Course,
            attributes: ['id', 'name']
          },
          {
            model: Class,
            attributes: ['id', 'name']
          }
        ]
      });
      
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      return draft;
    } catch (error) {
      logger.error('Error getting draft:', error);
      throw error;
    }
  }

  // Get drafts by student
  async getDraftsByStudent(studentId) {
    try {
      const drafts = await Draft.findAll({
        where: { student_id: studentId },
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Subject,
            attributes: ['id', 'name']
          },
          {
            model: Assignment,
            attributes: ['id', 'title']
          }
        ]
      });
      
      return drafts;
    } catch (error) {
      logger.error('Error getting drafts by student:', error);
      throw error;
    }
  }

  // Update draft
  async updateDraft(draftId, updateData) {
    try {
      const draft = await Draft.findByPk(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      // Calculate text statistics if content is being updated
      if (updateData.content) {
        const stats = this.calculateTextStatistics(updateData.content);
        updateData.word_count = stats.wordCount;
        updateData.character_count = updateData.content.length;
      }
      
      // If this is a revision, increment version
      if (updateData.content && updateData.content !== draft.content) {
        updateData.version = draft.version + 1;
        updateData.parent_draft_id = draftId;
        
        // Create a new draft as a revision
        const revision = await Draft.create({
          ...draft.toJSON(),
          ...updateData,
          id: undefined,
          created_at: undefined,
          updated_at: undefined
        });
        
        return revision;
      }
      
      // Update existing draft
      await draft.update(updateData);
      return draft;
    } catch (error) {
      logger.error('Error updating draft:', error);
      throw error;
    }
  }

  // Delete draft
  async deleteDraft(draftId) {
    try {
      const draft = await Draft.findByPk(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      await draft.destroy();
      logger.info('Draft deleted successfully', { draftId });
      return { message: 'Draft deleted successfully' };
    } catch (error) {
      logger.error('Error deleting draft:', error);
      throw error;
    }
  }

  // Submit draft for review
  async submitDraft(draftId) {
    try {
      const draft = await Draft.findByPk(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      // Update status to submitted
      await draft.update({
        status: 'submitted'
      });
      
      logger.info('Draft submitted for review', { draftId });
      return draft;
    } catch (error) {
      logger.error('Error submitting draft:', error);
      throw error;
    }
  }

  // Analyze draft with AI
  async analyzeDraftWithAI(draftId) {
    try {
      const draft = await Draft.findByPk(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      // Perform AI analysis
      const analysis = await AIService.analyzeDraft(draft.content, draft.draft_type);
      
      // Update draft with AI analysis results
      await draft.update({
        ai_analysis_score: analysis.analysisScore,
        ai_grammar_score: analysis.grammarScore,
        ai_clarity_score: analysis.clarityScore,
        ai_coherence_score: analysis.coherenceScore,
        ai_originality_score: analysis.originalityScore,
        ai_detected_plagiarism: analysis.plagiarismScore
      });
      
      logger.info('Draft analyzed with AI', { draftId });
      return {
        draft,
        analysis
      };
    } catch (error) {
      logger.error('Error analyzing draft with AI:', error);
      throw error;
    }
  }

  // Generate AI feedback for draft
  async generateDraftFeedback(draftId) {
    try {
      const draft = await Draft.findByPk(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      // Generate feedback
      const feedback = await AIService.generateDraftFeedback(draft.content, draft.draft_type);
      
      // Update draft with feedback
      await draft.update({
        ai_feedback: feedback.feedback
      });
      
      // Add to feedback history
      const feedbackHistory = draft.feedback_history || [];
      feedbackHistory.push({
        timestamp: new Date(),
        feedback: feedback.feedback,
        suggestions: feedback.suggestions
      });
      
      await draft.update({
        feedback_history: feedbackHistory
      });
      
      logger.info('Draft feedback generated', { draftId });
      return {
        draft,
        feedback
      };
    } catch (error) {
      logger.error('Error generating draft feedback:', error);
      throw error;
    }
  }

  // Generate improvement suggestions for draft
  async generateImprovementSuggestions(draftId, focusAreas = []) {
    try {
      const draft = await Draft.findByPk(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      // Generate improvement suggestions
      const suggestions = await AIService.generateImprovementSuggestions(
        draft.content, 
        draft.draft_type, 
        focusAreas
      );
      
      // Update draft with suggestions
      await draft.update({
        ai_improvement_suggestions: suggestions
      });
      
      logger.info('Draft improvement suggestions generated', { draftId });
      return {
        draft,
        suggestions
      };
    } catch (error) {
      logger.error('Error generating improvement suggestions:', error);
      throw error;
    }
  }

  // Add revision notes to draft
  async addRevisionNotes(draftId, notes) {
    try {
      const draft = await Draft.findByPk(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      await draft.update({
        revision_notes: notes
      });
      
      logger.info('Revision notes added to draft', { draftId });
      return draft;
    } catch (error) {
      logger.error('Error adding revision notes:', error);
      throw error;
    }
  }

  // Get draft revisions
  async getDraftRevisions(draftId) {
    try {
      const revisions = await Draft.findAll({
        where: { parent_draft_id: draftId },
        order: [['created_at', 'ASC']],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      });
      
      return revisions;
    } catch (error) {
      logger.error('Error getting draft revisions:', error);
      throw error;
    }
  }

  // Compare draft versions
  async compareDraftVersions(draftId1, draftId2) {
    try {
      const draft1 = await Draft.findByPk(draftId1);
      const draft2 = await Draft.findByPk(draftId2);
      
      if (!draft1 || !draft2) {
        throw new Error('One or both drafts not found');
      }
      
      // Simple comparison - in a real implementation, this would be more sophisticated
      const comparison = {
        draft1: {
          id: draft1.id,
          title: draft1.title,
          wordCount: draft1.word_count,
          characterCount: draft1.character_count,
          version: draft1.version
        },
        draft2: {
          id: draft2.id,
          title: draft2.title,
          wordCount: draft2.word_count,
          characterCount: draft2.character_count,
          version: draft2.version
        },
        differences: {
          wordsAdded: Math.max(0, draft2.word_count - draft1.word_count),
          wordsRemoved: Math.max(0, draft1.word_count - draft2.word_count),
          charactersAdded: Math.max(0, draft2.character_count - draft1.character_count),
          charactersRemoved: Math.max(0, draft1.character_count - draft2.character_count)
        }
      };
      
      return comparison;
    } catch (error) {
      logger.error('Error comparing draft versions:', error);
      throw error;
    }
  }

  // Add collaborator to draft
  async addCollaborator(draftId, userId) {
    try {
      const draft = await Draft.findByPk(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      // Update collaborators list
      const collaborators = draft.collaborators || [];
      if (!collaborators.includes(userId)) {
        collaborators.push(userId);
      }
      
      await draft.update({
        collaborators: collaborators,
        is_collaborative: true
      });
      
      logger.info('Collaborator added to draft', { draftId, userId });
      return draft;
    } catch (error) {
      logger.error('Error adding collaborator:', error);
      throw error;
    }
  }

  // Calculate text statistics
  calculateTextStatistics(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const paragraphs = text.split(/\n\n/).filter(paragraph => paragraph.trim().length > 0);
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
      readingTime: Math.ceil(words.length / 200) // avg 200 words per minute
    };
  }
}

module.exports = new DraftService();