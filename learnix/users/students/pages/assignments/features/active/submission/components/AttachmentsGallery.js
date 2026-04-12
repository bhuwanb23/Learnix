import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SUBMISSION_COLORS } from '../constants/submissionData';

export default function AttachmentsGallery({ attachments, onAddFile }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attachments</Text>
      <View style={styles.grid}>
        {attachments.map((attachment) => (
          <TouchableOpacity key={attachment.id} style={styles.imageContainer} activeOpacity={0.8}>
            <Image
              source={{ uri: attachment.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <MaterialIcons name="visibility" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={onAddFile} activeOpacity={0.7}>
          <MaterialIcons name="add-circle" size={28} color={SUBMISSION_COLORS.outline} />
          <Text style={styles.addButtonText}>Add File</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SUBMISSION_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: SUBMISSION_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageContainer: {
    width: '47%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: SUBMISSION_COLORS.surfaceContainer,
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  addButton: {
    width: '47%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SUBMISSION_COLORS.outlineVariant,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SUBMISSION_COLORS.surfaceContainer,
  },
  addButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: SUBMISSION_COLORS.outline,
    textTransform: 'uppercase',
  },
});
