const Document = require('../models/Document');
const { uploadSingle } = require('../utils/fileUpload');
const logger = require('../config/logger');

// Get all documents
const getAllDocuments = async (req, res) => {
  try {
    const { courseId, classId, subjectId } = req.query;
    let where = {};
    
    if (courseId) where.course_id = courseId;
    if (classId) where.class_id = classId;
    if (subjectId) where.subject_id = subjectId;
    
    const documents = await Document.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json(documents);
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

// Get document by ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    logger.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

// Upload new document
const uploadDocument = async (req, res) => {
  try {
    // Handle file upload first
    uploadSingle('document')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: 'File upload failed', details: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Create document record
      const documentData = {
        title: req.body.title,
        description: req.body.description,
        course_id: req.body.courseId,
        class_id: req.body.classId,
        subject_id: req.body.subjectId,
        uploaded_by: req.user.id,
        file_type: req.file.mimetype || 'application/octet-stream',
        file_name: req.file.filename,
        file_path: req.file.path,
        file_size: req.file.size,
        version: req.body.version || 1,
        is_public: req.body.isPublic || false,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
      };
      
      const document = await Document.create(documentData);
      
      res.status(201).json(document);
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

// Update document
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const documentData = {
      title: req.body.title,
      description: req.body.description,
      course_id: req.body.courseId,
      class_id: req.body.classId,
      subject_id: req.body.subjectId,
      file_type: req.body.fileType,
      file_name: req.body.fileName,
      file_path: req.body.filePath,
      file_size: req.body.fileSize,
      version: req.body.version,
      is_public: req.body.isPublic,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    };
    
    const document = await Document.update(documentData, {
      where: { id },
      returning: true
    });
    
    if (!document[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const updatedDocument = await Document.findByPk(id);
    
    res.json(updatedDocument);
  } catch (error) {
    logger.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.destroy({
      where: { id }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

// Download document
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // In a real implementation, you would stream the file from storage
    // For now, we'll just return the file information
    res.json({
      fileName: document.file_name,
      filePath: document.file_path,
      fileSize: document.file_size,
      fileType: document.file_type
    });
  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument
};