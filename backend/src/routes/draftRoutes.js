const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new draft
router.post('/', authorizeRole('student', 'teacher'), draftController.createDraft);

// Get draft by ID
router.get('/:id', authorizeRole('student', 'teacher'), draftController.getDraftById);

// Get drafts by student
router.get('/student/:studentId', authorizeRole('student', 'teacher'), draftController.getDraftsByStudent);

// Get current user's drafts
router.get('/', authorizeRole('student', 'teacher'), draftController.getCurrentUserDrafts);

// Update draft
router.put('/:id', authorizeRole('student', 'teacher'), draftController.updateDraft);

// Delete draft
router.delete('/:id', authorizeRole('student', 'teacher'), draftController.deleteDraft);

// Submit draft for review
router.patch('/:id/submit', authorizeRole('student', 'teacher'), draftController.submitDraft);

// Analyze draft with AI
router.post('/:id/analyze', authorizeRole('student', 'teacher'), draftController.analyzeDraftWithAI);

// Generate AI feedback for draft
router.post('/:id/feedback', authorizeRole('student', 'teacher'), draftController.generateDraftFeedback);

// Generate improvement suggestions for draft
router.post('/:id/suggestions', authorizeRole('student', 'teacher'), draftController.generateImprovementSuggestions);

// Add revision notes to draft
router.post('/:id/revision-notes', authorizeRole('student', 'teacher'), draftController.addRevisionNotes);

// Get draft revisions
router.get('/:id/revisions', authorizeRole('student', 'teacher'), draftController.getDraftRevisions);

// Compare draft versions
router.get('/compare/:id1/:id2', authorizeRole('student', 'teacher'), draftController.compareDraftVersions);

// Add collaborator to draft
router.post('/:id/collaborator', authorizeRole('student', 'teacher'), draftController.addCollaborator);

module.exports = router;