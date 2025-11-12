const DraftService = require('../services/draftService');
const { Draft } = require('../models');
const logger = require('../config/logger');

class DraftController {
  // Create a new draft
  async createDraft(req, res) {
    try {
      const draftData = {
        ...req.body,
        student_id: req.user.id // Assuming authentication middleware sets req.user
      };
      
      const draft = await DraftService.createDraft(draftData);
      res.status(201).json({ success: true, data: draft });
    } catch (error) {
      logger.error('Error creating draft:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Get draft by ID
  async getDraftById(req, res) {
    try {
      const { id } = req.params;
      const draft = await DraftService.getDraftById(id);
      
      // Check if user has permission to access this draft
      if (draft.student_id !== req.user.id && !req.user.is_teacher) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      res.json({ success: true, data: draft });
    } catch (error) {
      logger.error('Error getting draft:', error);
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // Get drafts by student
  async getDraftsByStudent(req, res) {
    try {
      const { studentId } = req.params;
      
      // Check if user has permission to access these drafts
      if (studentId != req.user.id && !req.user.is_teacher) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const drafts = await DraftService.getDraftsByStudent(studentId);
      res.json({ success: true, data: drafts });
    } catch (error) {
      logger.error('Error getting drafts by student:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get current user's drafts
  async getCurrentUserDrafts(req, res) {
    try {
      const drafts = await DraftService.getDraftsByStudent(req.user.id);
      res.json({ success: true, data: drafts });
    } catch (error) {
      logger.error('Error getting user drafts:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Update draft
  async updateDraft(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Check if user has permission to update this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const updatedDraft = await DraftService.updateDraft(id, updateData);
      res.json({ success: true, data: updatedDraft });
    } catch (error) {
      logger.error('Error updating draft:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Delete draft
  async deleteDraft(req, res) {
    try {
      const { id } = req.params;
      
      // Check if user has permission to delete this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      await DraftService.deleteDraft(id);
      res.json({ success: true, message: 'Draft deleted successfully' });
    } catch (error) {
      logger.error('Error deleting draft:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Submit draft for review
  async submitDraft(req, res) {
    try {
      const { id } = req.params;
      
      // Check if user has permission to submit this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const submittedDraft = await DraftService.submitDraft(id);
      res.json({ success: true, data: submittedDraft });
    } catch (error) {
      logger.error('Error submitting draft:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Analyze draft with AI
  async analyzeDraftWithAI(req, res) {
    try {
      const { id } = req.params;
      
      // Check if user has permission to analyze this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id && !req.user.is_teacher) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const result = await DraftService.analyzeDraftWithAI(id);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error analyzing draft with AI:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Generate AI feedback for draft
  async generateDraftFeedback(req, res) {
    try {
      const { id } = req.params;
      
      // Check if user has permission to get feedback for this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id && !req.user.is_teacher) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const result = await DraftService.generateDraftFeedback(id);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error generating draft feedback:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Generate improvement suggestions for draft
  async generateImprovementSuggestions(req, res) {
    try {
      const { id } = req.params;
      const { focusAreas } = req.body;
      
      // Check if user has permission to get suggestions for this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id && !req.user.is_teacher) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const result = await DraftService.generateImprovementSuggestions(id, focusAreas);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error generating improvement suggestions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Add revision notes to draft
  async addRevisionNotes(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      // Check if user has permission to add notes to this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const updatedDraft = await DraftService.addRevisionNotes(id, notes);
      res.json({ success: true, data: updatedDraft });
    } catch (error) {
      logger.error('Error adding revision notes:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Get draft revisions
  async getDraftRevisions(req, res) {
    try {
      const { id } = req.params;
      
      // Check if user has permission to access revisions of this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id && !req.user.is_teacher) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const revisions = await DraftService.getDraftRevisions(id);
      res.json({ success: true, data: revisions });
    } catch (error) {
      logger.error('Error getting draft revisions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Compare draft versions
  async compareDraftVersions(req, res) {
    try {
      const { id1, id2 } = req.params;
      
      // Check if user has permission to compare these drafts
      const draft1 = await Draft.findByPk(id1);
      const draft2 = await Draft.findByPk(id2);
      
      if (!draft1 || !draft2) {
        return res.status(404).json({ 
          success: false, 
          message: 'One or both drafts not found' 
        });
      }
      
      if ((draft1.student_id !== req.user.id && !req.user.is_teacher) ||
          (draft2.student_id !== req.user.id && !req.user.is_teacher)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const comparison = await DraftService.compareDraftVersions(id1, id2);
      res.json({ success: true, data: comparison });
    } catch (error) {
      logger.error('Error comparing draft versions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Add collaborator to draft
  async addCollaborator(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      // Check if user has permission to add collaborators to this draft
      const draft = await Draft.findByPk(id);
      if (!draft) {
        return res.status(404).json({ 
          success: false, 
          message: 'Draft not found' 
        });
      }
      
      if (draft.student_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }
      
      const updatedDraft = await DraftService.addCollaborator(id, userId);
      res.json({ success: true, data: updatedDraft });
    } catch (error) {
      logger.error('Error adding collaborator:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new DraftController();