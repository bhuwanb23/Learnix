import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const UploadArea = ({ onFileSelect, uploadState, uploadProgress }) => {
  const isUploading = uploadState === 'uploading';
  
  return (
    <View style={styles.container}>
      {!isUploading ? (
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={onFileSelect}
          activeOpacity={0.8}
        >
          <View style={styles.uploadIconContainer}>
            <Text style={styles.uploadIcon}>☁️</Text>
          </View>
          <Text style={styles.uploadTitle}>Upload Lecture Notes</Text>
          <Text style={styles.uploadSubtitle}>
            Drag and drop files here or tap to browse
          </Text>
          <TouchableOpacity style={styles.chooseButton} onPress={onFileSelect}>
            <Text style={styles.chooseButtonText}>Choose Files</Text>
          </TouchableOpacity>
          <Text style={styles.supportedFormats}>
            PDF, PPT, DOC, Video files supported
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Uploading...</Text>
            <Text style={styles.progressPercentage}>{Math.round(uploadProgress)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${uploadProgress}%` }
                ]} 
              />
            </View>
          </View>
          <Text style={styles.progressFileName}>
            Mathematics_Chapter5.pdf • 2.4 MB
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center'
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#DBEAFE',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  uploadIcon: {
    fontSize: 24,
    color: '#2563EB'
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center'
  },
  chooseButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8
  },
  chooseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500'
  },
  supportedFormats: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  progressContainer: {
    padding: 16
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827'
  },
  progressPercentage: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600'
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressBarBackground: {
    width: '100%',
    height: '100%'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4
  },
  progressFileName: {
    fontSize: 12,
    color: '#6B7280'
  }
});

export default UploadArea;
