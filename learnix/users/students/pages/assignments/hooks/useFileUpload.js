import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export const useFileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const pickDocument = async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        
        const newFile = {
          id: Date.now().toString(),
          name: file.name,
          uri: file.uri,
          size: fileInfo.size,
          type: file.mimeType,
          uploadedAt: new Date(),
        };

        setUploadedFiles(prevFiles => [...prevFiles, newFile]);
        return newFile;
      }
    } catch (err) {
      setError('Failed to pick document');
      console.error('Error picking document:', err);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  const uploadFiles = async (assignmentId) => {
    if (uploadedFiles.length === 0) {
      setError('No files to upload');
      return false;
    }

    try {
      setUploading(true);
      setError(null);

      // Simulate file upload
      for (const file of uploadedFiles) {
        // In a real app, you would upload to your server here
        console.log('Uploading file:', file.name);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Clear files after successful upload
      setUploadedFiles([]);
      return true;
    } catch (err) {
      setError('Failed to upload files');
      console.error('Error uploading files:', err);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const getFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return 'document-text-outline';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document-outline';
    if (mimeType.includes('image')) return 'image-outline';
    if (mimeType.includes('video')) return 'videocam-outline';
    if (mimeType.includes('audio')) return 'musical-notes-outline';
    return 'document-outline';
  };

  const getFileColor = (mimeType) => {
    if (mimeType.includes('pdf')) return '#EF4444';
    if (mimeType.includes('word') || mimeType.includes('document')) return '#3B82F6';
    if (mimeType.includes('image')) return '#10B981';
    if (mimeType.includes('video')) return '#8B5CF6';
    if (mimeType.includes('audio')) return '#F59E0B';
    return '#6B7280';
  };

  return {
    uploadedFiles,
    uploading,
    error,
    pickDocument,
    removeFile,
    clearFiles,
    uploadFiles,
    getFileSize,
    getFileIcon,
    getFileColor,
  };
};
