import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COMPLETED_REVIEW_COLORS } from '../constants/completedReviewData';

export default function FileAttachmentCard({ assignment }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attached Documents</Text>
      <View style={styles.fileCard}>
        <View style={styles.fileIcon}>
          <MaterialIcons name="description" size={24} color={COMPLETED_REVIEW_COLORS.primary} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{assignment.attachedFile.name}</Text>
          <Text style={styles.fileMeta}>{assignment.attachedFile.size} • {assignment.attachedFile.type}</Text>
        </View>
        <MaterialIcons name="download" size={20} color={COMPLETED_REVIEW_COLORS.onSurfaceVariant} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COMPLETED_REVIEW_COLORS.surfaceContainerLowest,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
    marginBottom: 16,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: COMPLETED_REVIEW_COLORS.surfaceContainerLow,
    gap: 12,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: `${COMPLETED_REVIEW_COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
  },
  fileMeta: {
    fontFamily: 'Manrope-Medium',
    fontSize: 10,
    fontWeight: '500',
    color: COMPLETED_REVIEW_COLORS.onSurfaceVariant,
  },
});
