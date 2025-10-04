import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const UploadButton = ({ onUpload, uploadState, disabled = false }) => {
  const isUploading = uploadState === 'uploading';
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.uploadButton,
          disabled && styles.disabledButton
        ]}
        onPress={onUpload}
        disabled={disabled || isUploading}
        activeOpacity={0.8}
      >
        <Text style={styles.uploadButtonText}>
          {isUploading ? 'Uploading...' : 'Upload & Share'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  uploadButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabledButton: {
    backgroundColor: '#9CA3AF'
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default UploadButton;
