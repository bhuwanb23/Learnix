const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateRequest, documentValidationSchema } = require('../middleware/validation');

// All document routes require authentication
router.use(authenticateToken);

// Admin and teacher can manage documents, students can view
router.route('/')
  .get(authorizeRole('admin', 'teacher', 'student'), documentController.getAllDocuments)
  .post(
    authorizeRole('admin', 'teacher'), 
    documentController.uploadDocument
  );

router.route('/:id')
  .get(authorizeRole('admin', 'teacher', 'student'), documentController.getDocumentById)
  .put(authorizeRole('admin', 'teacher'), documentController.updateDocument)
  .delete(authorizeRole('admin', 'teacher'), documentController.deleteDocument);

// Download document
router.get('/:id/download', authorizeRole('admin', 'teacher', 'student'), documentController.downloadDocument);

module.exports = router;