const Document = require('../models/Document');
const { uploadSingle } = require('../utils/fileUpload');
const logger = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');
const pdf = require('pdf-parse');
const sharp = require('sharp');

// Extract metadata from file
const extractMetadata = async (file) => {
  try {
    const metadata = {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadDate: new Date().toISOString(),
      extension: path.extname(file.originalname).toLowerCase()
    };
    
    // For PDF files, extract additional metadata
    if (file.mimetype === 'application/pdf') {
      try {
        const data = await fs.readFile(file.path);
        const pdfData = await pdf(data);
        
        metadata.pageCount = pdfData.numpages;
        metadata.title = pdfData.info.Title || '';
        metadata.author = pdfData.info.Author || '';
        metadata.subject = pdfData.info.Subject || '';
        metadata.creator = pdfData.info.Creator || '';
        metadata.producer = pdfData.info.Producer || '';
        metadata.creationDate = pdfData.info.CreationDate || '';
        metadata.modDate = pdfData.info.ModDate || '';
        
        // Extract first 500 characters as a preview of content
        metadata.contentPreview = pdfData.text.substring(0, 500);
      } catch (pdfError) {
        logger.warn('Error extracting PDF metadata:', pdfError);
      }
    }
    
    // For image files, get dimensions
    if (file.mimetype.startsWith('image/')) {
      try {
        const image = sharp(file.path);
        const metadataInfo = await image.metadata();
        metadata.width = metadataInfo.width;
        metadata.height = metadataInfo.height;
        metadata.format = metadataInfo.format;
        metadata.channels = metadataInfo.channels;
      } catch (imageError) {
        logger.warn('Error extracting image metadata:', imageError);
      }
    }
    
    return metadata;
  } catch (error) {
    logger.error('Error extracting metadata:', error);
    return {};
  }
};

// Generate preview for file
const generatePreview = async (file) => {
  try {
    // For PDF files, generate thumbnail of first page
    if (file.mimetype === 'application/pdf') {
      // In a real implementation, you would use a library like pdf-poppler or similar
      // to convert the first page of the PDF to an image
      // For now, we'll just return a placeholder
      return {
        path: null,
        type: 'pdf-thumbnail'
      };
    }
    
    // For image files, generate thumbnail
    if (file.mimetype.startsWith('image/')) {
      try {
        const previewPath = path.join(path.dirname(file.path), 'previews');
        
        // Ensure preview directory exists
        await fs.mkdir(previewPath, { recursive: true });
        
        const previewFileName = `preview_${file.filename}${path.extname(file.originalname)}`;
        const previewFilePath = path.join(previewPath, previewFileName);
        
        // Generate thumbnail (150x150 pixels)
        await sharp(file.path)
          .resize(150, 150, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toFile(previewFilePath);
        
        return {
          path: previewFilePath,
          type: 'image-thumbnail'
        };
      } catch (imageError) {
        logger.warn('Error generating image preview:', imageError);
        return null;
      }
    }
    
    // For other file types, return null
    return null;
  } catch (error) {
    logger.error('Error generating preview:', error);
    return null;
  }
};

// Get all documents with search and filtering capabilities
const getAllDocuments = async (req, res) => {
  try {
    const { courseId, classId, subjectId, search, tags, fileType, isPublic, page = 1, limit = 20 } = req.query;
    let where = {};
    
    // Apply filters
    if (courseId) where.course_id = courseId;
    if (classId) where.class_id = classId;
    if (subjectId) where.subject_id = subjectId;
    if (isPublic !== undefined) where.is_public = isPublic;
    if (fileType) where.file_type = fileType;
    
    // Apply search filter
    if (search) {
      where = {
        ...where,
        [require('sequelize').Op.or]: [
          { title: { [require('sequelize').Op.like]: `%${search}%` } },
          { description: { [require('sequelize').Op.like]: `%${search}%` } }
        ]
      };
    }
    
    // Apply access control - only show public documents or documents uploaded by the user
    // For SQLite compatibility, we need to handle JSON operations differently
    if (req.user.role !== 'admin') {
      where = {
        ...where,
        [require('sequelize').Op.or]: [
          { is_public: true },
          { uploaded_by: req.user.id.toString() }
        ]
      };
      
      // For shared documents, we would need a more complex approach in SQLite
      // This is a simplified version for now that only handles public and owned documents
    }
    
    // Pagination
    const offset = (page - 1) * limit;
    
    const { count, rows: documents } = await Document.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
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
      
      // Extract metadata
      const metadata = await extractMetadata(req.file);
      
      // Generate preview
      const preview = await generatePreview(req.file);
      
      // Create document record
      const documentData = {
        title: req.body.title || req.file.originalname,
        description: req.body.description || '',
        course_id: req.body.courseId,
        class_id: req.body.classId,
        subject_id: req.body.subjectId,
        uploaded_by: req.user.id.toString(),
        file_type: req.file.mimetype || mime.lookup(req.file.originalname) || 'application/octet-stream',
        file_name: req.file.filename,
        file_path: req.file.path,
        file_size: req.file.size,
        version: req.body.version || 1,
        is_public: req.body.isPublic === 'true' || req.body.isPublic === true || false,
        tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags)) : [],
        metadata: metadata,
        access_level: req.body.accessLevel || 'private',
        shared_with: req.body.sharedWith ? (Array.isArray(req.body.sharedWith) ? req.body.sharedWith : JSON.parse(req.body.sharedWith)) : [],
        preview_path: preview ? preview.path : null,
        preview_type: preview ? preview.type : null
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
    
    // First, check if the document exists
    const existingDocument = await Document.findByPk(id);
    if (!existingDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if user has permission to update
    if (req.user.role !== 'admin' && existingDocument.uploaded_by !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Handle file upload if a new file is provided
    let documentData = {
      title: req.body.title,
      description: req.body.description,
      course_id: req.body.courseId,
      class_id: req.body.classId,
      subject_id: req.body.subjectId,
      is_public: req.body.isPublic === 'true' || req.body.isPublic === true || false,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags)) : [],
      access_level: req.body.accessLevel,
      shared_with: req.body.sharedWith ? (Array.isArray(req.body.sharedWith) ? req.body.sharedWith : JSON.parse(req.body.sharedWith)) : []
    };
    
    // If a new file is uploaded, update file-related fields
    if (req.file) {
      // Extract metadata
      const metadata = await extractMetadata(req.file);
      
      // Generate preview
      const preview = await generatePreview(req.file);
      
      // Update file-related fields
      documentData = {
        ...documentData,
        file_type: req.file.mimetype || mime.lookup(req.file.originalname) || 'application/octet-stream',
        file_name: req.file.filename,
        file_path: req.file.path,
        file_size: req.file.size,
        metadata: metadata,
        preview_path: preview ? preview.path : null,
        preview_type: preview ? preview.type : null,
        // Increment version when file is updated
        version: existingDocument.version + 1
      };
    }
    
    // Update the document
    await Document.update(documentData, {
      where: { id }
    });
    
    // Fetch the updated document
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
    
    // Check access permissions
    if (req.user.role !== 'admin' && 
        !document.is_public && 
        document.uploaded_by !== req.user.id.toString()) {
      // For shared documents, we would need to check if the user is in the shared_with array
      // This is a simplified version for now
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Check if file exists
    try {
      await fs.access(document.file_path);
    } catch (fileError) {
      return res.status(404).json({ error: 'File not found on storage' });
    }
    
    // Stream the file
    res.download(document.file_path, document.file_name, (err) => {
      if (err) {
        logger.error('Error streaming file:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
};

// Get document versions
const getDocumentVersions = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all versions of a document (documents with the same title or metadata)
    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Find all documents with the same title (as a simple versioning approach)
    const versions = await Document.findAll({
      where: {
        title: document.title
      },
      order: [['version', 'ASC']]
    });
    
    res.json(versions);
  } catch (error) {
    logger.error('Error fetching document versions:', error);
    res.status(500).json({ error: 'Failed to fetch document versions' });
  }
};

// Rollback to a specific document version
const rollbackDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body;
    
    // Get the document to rollback to
    const sourceDocument = await Document.findOne({
      where: {
        title: req.body.title,
        version: version
      }
    });
    
    if (!sourceDocument) {
      return res.status(404).json({ error: 'Source document version not found' });
    }
    
    // Get the current document
    const currentDocument = await Document.findByPk(id);
    if (!currentDocument) {
      return res.status(404).json({ error: 'Current document not found' });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && currentDocument.uploaded_by !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Create a new version by copying the source document
    const newVersionData = {
      ...sourceDocument.toJSON(),
      id: undefined, // Remove id to create a new record
      version: currentDocument.version + 1,
      updated_at: new Date()
    };
    
    const newDocument = await Document.create(newVersionData);
    
    res.json(newDocument);
  } catch (error) {
    logger.error('Error rolling back document:', error);
    res.status(500).json({ error: 'Failed to rollback document' });
  }
};

// Share document with users
const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds, accessLevel } = req.body;
    
    // Get the document
    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && document.uploaded_by !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Update sharing information
    const sharedWith = Array.isArray(userIds) ? userIds : [userIds];
    const updatedDocument = await document.update({
      access_level: accessLevel || 'shared',
      shared_with: sharedWith
    });
    
    res.json(updatedDocument);
  } catch (error) {
    logger.error('Error sharing document:', error);
    res.status(500).json({ error: 'Failed to share document' });
  }
};

// Get document preview
const getDocumentPreview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check access permissions
    if (req.user.role !== 'admin' && 
        !document.is_public && 
        document.uploaded_by !== req.user.id.toString()) {
      // For shared documents, we would need to check if the user is in the shared_with array
      // This is a simplified version for now
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // If no preview exists, return document info
    if (!document.preview_path) {
      return res.json({
        message: 'No preview available',
        document: {
          id: document.id,
          title: document.title,
          fileType: document.file_type,
          fileSize: document.file_size
        }
      });
    }
    
    // Check if preview file exists
    try {
      await fs.access(document.preview_path);
    } catch (fileError) {
      return res.status(404).json({ error: 'Preview not found on storage' });
    }
    
    // Stream the preview
    res.download(document.preview_path, `preview_${document.file_name}`, (err) => {
      if (err) {
        logger.error('Error streaming preview:', err);
        res.status(500).json({ error: 'Failed to download preview' });
      }
    });
  } catch (error) {
    logger.error('Error getting document preview:', error);
    res.status(500).json({ error: 'Failed to get document preview' });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentVersions,
  rollbackDocument,
  shareDocument,
  getDocumentPreview
};