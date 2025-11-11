const Document = require('../models/Document');
const { uploadSingle } = require('../utils/fileUpload');
const logger = require('../config/logger');

// Get all documents
const getAllDocuments = async (req, res) => {
  try {
    const { courseId, classId, subjectId, tags } = req.query;
    let filter = {};
    
    if (courseId) filter.courseId = courseId;
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (tags) {
      filter.tags = { $in: tags.split(',') };
    }
    
    const documents = await Document.find(filter)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('uploadedBy')
      .sort({ createdAt: -1 });
    
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
    const document = await Document.findById(id)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('uploadedBy');
    
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
        ...req.body,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        fileType: req.file.mimetype || 'application/octet-stream',
        uploadedBy: req.user.id
      };
      
      const document = new Document(documentData);
      await document.save();
      
      // Populate references
      const populatedDocument = await Document.findById(document._id)
        .populate('courseId')
        .populate('classId')
        .populate('subjectId')
        .populate('uploadedBy');
      
      res.status(201).json(populatedDocument);
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
    const documentData = req.body;
    
    const document = await Document.findByIdAndUpdate(
      id,
      documentData,
      { new: true, runValidators: true }
    );
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Populate references
    const populatedDocument = await Document.findById(document._id)
      .populate('courseId')
      .populate('classId')
      .populate('subjectId')
      .populate('uploadedBy');
    
    res.json(populatedDocument);
  } catch (error) {
    logger.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByIdAndDelete(id);
    
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
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // In a real implementation, you would stream the file from storage
    // For now, we'll just return the file information
    res.json({
      fileName: document.fileName,
      filePath: document.filePath,
      fileSize: document.fileSize,
      fileType: document.fileType
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