const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { uploadSingle } = require('../utils/fileUpload');

// All document routes require authentication
router.use(authenticateToken);

// Admin and teacher can manage documents, students can view
router.route('/')
  .get(authorizeRole('admin', 'teacher', 'student'), documentController.getAllDocuments)
  .post(
    authorizeRole('admin', 'teacher'), 
    uploadSingle('document'),
    documentController.uploadDocument
  );

router.route('/:id')
  .get(authorizeRole('admin', 'teacher', 'student'), documentController.getDocumentById)
  .put(
    authorizeRole('admin', 'teacher'), 
    uploadSingle('document'),
    documentController.updateDocument
  )
  .delete(authorizeRole('admin', 'teacher'), documentController.deleteDocument);

// Document versioning
router.get('/:id/versions', authorizeRole('admin', 'teacher', 'student'), documentController.getDocumentVersions);
router.post('/:id/rollback', authorizeRole('admin', 'teacher'), documentController.rollbackDocument);

// Document sharing
router.post('/:id/share', authorizeRole('admin', 'teacher'), documentController.shareDocument);

// Document preview
router.get('/:id/preview', authorizeRole('admin', 'teacher', 'student'), documentController.getDocumentPreview);

// Download document
router.get('/:id/download', authorizeRole('admin', 'teacher', 'student'), documentController.downloadDocument);

module.exports = router;