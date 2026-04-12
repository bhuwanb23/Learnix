import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SUBMISSION_COLORS } from '../constants/submissionData';

export default function TextEditor({ editor, onSaveDraft, onSubmit }) {
  const [text, setText] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolButton}>
          <MaterialIcons name="format-bold" size={20} color={SUBMISSION_COLORS.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <MaterialIcons name="format-italic" size={20} color={SUBMISSION_COLORS.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <MaterialIcons name="format-list-bulleted" size={20} color={SUBMISSION_COLORS.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.toolButton}>
          <MaterialIcons name="link" size={20} color={SUBMISSION_COLORS.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <MaterialIcons name="image" size={20} color={SUBMISSION_COLORS.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={styles.saveStatus}>
          <View style={styles.saveDot} />
          <Text style={styles.saveText}>Auto-saved 2 mins ago</Text>
        </View>
      </View>

      <View style={styles.editorContent}>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="Start typing your assignment here..."
          placeholderTextColor={SUBMISSION_COLORS.outlineVariant}
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.stats}>
          <Text style={styles.statLabel}>
            WORDS: <Text style={styles.statValue}>{editor.wordCount}</Text>
          </Text>
          <Text style={styles.statLabel}>
            PAGES: <Text style={styles.statValue}>{editor.pageCount}</Text>
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveDraftButton} onPress={onSaveDraft} activeOpacity={0.7}>
            <Text style={styles.saveDraftText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={onSubmit} activeOpacity={0.8}>
            <Text style={styles.submitButtonText}>Submit Assignment</Text>
          </TouchableOpacity>
        </View>
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
    overflow: 'hidden',
    minHeight: 400,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SUBMISSION_COLORS.surfaceContainer,
    gap: 4,
  },
  toolButton: {
    padding: 8,
    borderRadius: 8,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: SUBMISSION_COLORS.surfaceContainer,
    marginHorizontal: 8,
  },
  saveStatus: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SUBMISSION_COLORS.green,
  },
  saveText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    fontWeight: '600',
    color: SUBMISSION_COLORS.onSurfaceVariant,
  },
  editorContent: {
    flex: 1,
    padding: 24,
    minHeight: 300,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 16,
    lineHeight: 28,
    color: SUBMISSION_COLORS.onSurface,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: SUBMISSION_COLORS.surfaceContainer,
    backgroundColor: `${SUBMISSION_COLORS.surfaceContainerLow}80`,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: SUBMISSION_COLORS.onSurfaceVariant,
  },
  statValue: {
    color: SUBMISSION_COLORS.onSurface,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveDraftButton: {
    backgroundColor: SUBMISSION_COLORS.surfaceContainerHigh,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveDraftText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: SUBMISSION_COLORS.onSurface,
  },
  submitButton: {
    backgroundColor: SUBMISSION_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: SUBMISSION_COLORS.onPrimary,
  },
});
