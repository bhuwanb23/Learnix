import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateHeader from '../../components/CreateHeader';
import ChipSelector from '../../components/ChipSelector';
import CreateActions from '../../components/CreateActions';
import FormField from '../../components/FormField';
import {
  CREATE_EXAM_HEADER,
  EXAM_FORM_FIELDS,
  EXAM_CLASS_OPTIONS,
  EXAM_DURATION_OPTIONS,
} from './constants/createExamData';

export default function CreateExam({ route, navigation }) {
  const [values, setValues] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [duration, setDuration] = useState(null);

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleChange = (key, text) => {
    setValues((prev) => ({ ...prev, [key]: text }));
  };

  const requiredKeys = EXAM_FORM_FIELDS.filter((field) => field.required).map((field) => field.key);
  const valid =
    requiredKeys.every((key) => values[key] && values[key].trim().length > 0) &&
    Boolean(selectedClass) &&
    Boolean(duration);

  const handleSave = () => {
    handleBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CreateHeader
        title={CREATE_EXAM_HEADER.title}
        subtitle={CREATE_EXAM_HEADER.subtitle}
        onBack={handleBack}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          {EXAM_FORM_FIELDS.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={values[field.key] || ''}
              onChange={handleChange}
            />
          ))}
          <ChipSelector
            label="Class"
            options={EXAM_CLASS_OPTIONS}
            selected={selectedClass}
            onSelect={setSelectedClass}
          />
          <ChipSelector
            label="Duration"
            options={EXAM_DURATION_OPTIONS}
            selected={duration}
            onSelect={setDuration}
          />
        </View>
      </ScrollView>
      <CreateActions
        onCancel={handleBack}
        onSave={handleSave}
        valid={valid}
        saveLabel="Schedule Exam"
        saveIcon="event"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e5e8ec',
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
});