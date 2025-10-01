import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function UploadCard({ onChooseFiles, uploadedFiles, onRemoveFile }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Submit Assignment</Text>
      
      <TouchableOpacity
        style={styles.uploadArea}
        onPress={onChooseFiles}
        activeOpacity={0.7}
      >
        <View style={styles.uploadContent}>
          <Ionicons
            name="cloud-upload-outline"
            size={48}
            color={COLORS.gray400}
            style={styles.uploadIcon}
          />
          <Text style={styles.uploadTitle}>Drag & Drop Files</Text>
          <Text style={styles.uploadSubtitle}>or tap to browse</Text>
          <TouchableOpacity
            style={styles.chooseButton}
            onPress={onChooseFiles}
          >
            <Text style={styles.chooseButtonText}>Choose Files</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {uploadedFiles.length > 0 && (
        <View style={styles.filesContainer}>
          {uploadedFiles.map((file) => (
            <View key={file.id} style={styles.fileItem}>
              <View style={styles.fileInfo}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#EF4444"
                  style={styles.fileIcon}
                />
                <Text style={styles.fileName}>{file.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveFile(file.id)}
              >
                <Ionicons
                  name="close"
                  size={16}
                  color="#EF4444"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {uploadedFiles.length > 0 && (
        <TouchableOpacity style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Submit Assignment</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.gray300,
    marginBottom: SPACING.md,
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadIcon: {
    marginBottom: SPACING.md,
  },
  uploadTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  chooseButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  chooseButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#FFFFFF',
  },
  filesContainer: {
    marginBottom: SPACING.md,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray50,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xs,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    marginRight: SPACING.sm,
  },
  fileName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },
  removeButton: {
    padding: SPACING.xs,
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#FFFFFF',
  },
});
