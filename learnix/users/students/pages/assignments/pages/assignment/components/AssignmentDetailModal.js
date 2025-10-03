import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AssignmentDetailModal({ visible, assignment, onClose, onSubmit }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: SCREEN_HEIGHT,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.spring(slideAnim, {
      toValue: SCREEN_HEIGHT,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      onClose();
    });
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files Selected', 'Please select files to upload before submitting.');
      return;
    }
    
    onSubmit(assignment.id, selectedFiles);
    handleClose();
  };

  const handleFileUpload = () => {
    Alert.alert(
      'File Upload',
      'File upload functionality would be implemented here. For now, simulating file selection.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Select Files',
          onPress: () => {
            setSelectedFiles([`${assignment.title.toLowerCase().replace(/\s+/g, '-')}.pdf`]);
          },
        },
      ]
    );
  };

  if (!assignment) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assignment Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Assignment Info */}
            <View style={styles.assignmentInfo}>
              <Text style={styles.assignmentTitle}>{assignment.title}</Text>
              <Text style={styles.assignmentCourse}>
                {assignment.course} • {assignment.courseCode}
              </Text>
              
              {assignment.description && (
                <Text style={styles.assignmentDescription}>
                  {assignment.description}
                </Text>
              )}
            </View>

            {/* Requirements */}
            {assignment.requirements && (
              <View style={styles.requirementsSection}>
                <Text style={styles.sectionTitle}>Requirements:</Text>
                <View style={styles.requirementsContainer}>
                  {assignment.requirements.map((req, index) => (
                    <Text key={index} style={styles.requirementText}>
                      • {req}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* Upload Section */}
            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>Upload Assignment</Text>
              
              <TouchableOpacity
                style={styles.uploadArea}
                onPress={handleFileUpload}
                activeOpacity={0.7}
              >
                <View style={styles.uploadContent}>
                  <Ionicons name="cloud-upload-outline" size={32} color={COLORS.textTertiary} />
                  <Text style={styles.uploadText}>
                    {selectedFiles.length > 0 ? 'Files Selected' : 'Drag & drop files or click to browse'}
                  </Text>
                  {selectedFiles.length > 0 ? (
                    <View style={styles.selectedFiles}>
                      {selectedFiles.map((file, index) => (
                        <Text key={index} style={styles.selectedFileText}>
                          {file}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.uploadSubText}>
                      Supports: {assignment.allowedFileTypes?.join(', ')} (Max {assignment.maxFileSize})
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                selectedFiles.length === 0 && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={selectedFiles.length === 0}
            >
              <Text style={styles.submitButtonText}>Submit Assignment</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['3xl'],
    borderTopRightRadius: BORDER_RADIUS['3xl'],
    maxHeight: SCREEN_HEIGHT * 0.9,
    minHeight: SCREEN_HEIGHT * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalContent: {
    padding: SPACING.md,
  },
  assignmentInfo: {
    marginBottom: SPACING.md,
  },
  assignmentTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  assignmentCourse: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  assignmentDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  requirementsSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  requirementsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
  },
  requirementText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 18 },
  uploadSection: {
    marginBottom: SPACING.md,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  uploadSubText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  selectedFiles: {
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  selectedFileText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  submitSection: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  submitButtonText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.white,
  },
});