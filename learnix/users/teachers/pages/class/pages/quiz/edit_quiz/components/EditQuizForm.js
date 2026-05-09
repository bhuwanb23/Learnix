import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { QUIZ_TITLE, QUIZ_DESCRIPTION, QUIZ_STRUCTURE } from '../constants/quizConstants';

export default function EditQuizForm() {
  const [title, setTitle] = useState(QUIZ_TITLE);
  const [description, setDescription] = useState(QUIZ_DESCRIPTION);

  return (
    <View style={styles.formContainer}>
      <Text style={styles.label}>Quiz Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter quiz title"
        placeholderTextColor="#b0b0b0"
      />
      <Text style={[styles.label, { marginTop: 20 }]}>Description</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Enter description"
        placeholderTextColor="#b0b0b0"
        multiline
        numberOfLines={4}
      />
      <View style={styles.structureBox}>
        <Text style={styles.structureTitle}>Quiz Structure</Text>
        <Text style={styles.structureText}>{QUIZ_STRUCTURE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: '#595c5e',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#eef1f3',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#2c2f31',
    fontFamily: 'Manrope-Regular',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  structureBox: {
    backgroundColor: '#e5e9eb',
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
    alignItems: 'center',
  },
  structureTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: '#0050d4',
    fontWeight: '700',
    marginBottom: 4,
  },
  structureText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#2c2f31',
    fontWeight: '700',
  },
});
