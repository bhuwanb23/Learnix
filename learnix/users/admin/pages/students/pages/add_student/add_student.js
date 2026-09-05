import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ActionButton from '../../../../components/ui/ActionButton';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../constants/theme';

const PROGRAMS = ['B.Tech CSE', 'B.Tech ECE', 'B.Tech ME', 'B.Tech CE', 'BBA', 'BCA', 'MBA'];
const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

export default function AddStudent({ student, onBack, onSave }) {
  const [form, setForm] = useState({
    name: student?.name || '',
    rollNo: student?.rollNo || '',
    email: student?.email || '',
    phone: student?.phone || '',
    department: student?.department || 'Computer Science',
    program: student?.program || 'B.Tech CSE',
    semester: student?.semester || 'Semester 1',
    batch: student?.batch || 'Batch 2024',
  });
  const [showProgramPicker, setShowProgramPicker] = useState(false);
  const [showSemesterPicker, setShowSemesterPicker] = useState(false);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.name.trim() || !form.rollNo.trim() || !form.email.trim()) {
      Alert.alert('Missing Fields', 'Please fill in name, roll number, and email.');
      return;
    }
    if (!form.email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    Alert.alert(
      'Save Student',
      student ? 'Update this student record?' : 'Create this new student record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: student ? 'Update' : 'Create',
          onPress: () => {
            Alert.alert(
              'Success',
              `${student ? 'Student updated' : 'Student added'} successfully. Roll No: ${form.rollNo}`,
              [{ text: 'OK', onPress: onSave }]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{student ? 'Edit Student' : 'Add New Student'}</Text>
            <Text style={styles.headerSubtitle}>Fill in the details below</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Personal Details</Text>
        <Field label="Full Name" icon="person-outline" value={form.name} onChangeText={(v) => updateField('name', v)} placeholder="e.g. Aarav Mehta" />
        <Field label="Roll Number" icon="pricetag-outline" value={form.rollNo} onChangeText={(v) => updateField('rollNo', v)} placeholder="e.g. CSE-24-001" />
        <Field label="Email" icon="mail-outline" value={form.email} onChangeText={(v) => updateField('email', v)} placeholder="student@learnix.edu" keyboardType="email-address" />
        <Field label="Phone" icon="call-outline" value={form.phone} onChangeText={(v) => updateField('phone', v)} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />

        <Text style={styles.sectionLabel}>Academic Details</Text>
        <Field label="Department" icon="business-outline" value={form.department} onChangeText={(v) => updateField('department', v)} placeholder="e.g. Computer Science" />

        {/* Program picker */}
        <Text style={styles.fieldLabel}>Program</Text>
        <TouchableOpacity style={styles.picker} onPress={() => { setShowProgramPicker(!showProgramPicker); setShowSemesterPicker(false); }} activeOpacity={0.8}>
          <Ionicons name="school-outline" size={16} color="#2563eb" />
          <Text style={styles.pickerText}>{form.program}</Text>
          <Ionicons name="chevron-down" size={16} color="#94a3b8" />
        </TouchableOpacity>
        {showProgramPicker ? (
          <View style={styles.pickerList}>
            {PROGRAMS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.pickerItem, form.program === p && styles.pickerItemActive]}
                onPress={() => { updateField('program', p); setShowProgramPicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerItemText, form.program === p && styles.pickerItemTextActive]}>{p}</Text>
                {form.program === p ? <Ionicons name="checkmark" size={16} color="#2563eb" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Semester picker */}
        <Text style={styles.fieldLabel}>Semester</Text>
        <TouchableOpacity style={styles.picker} onPress={() => { setShowSemesterPicker(!showSemesterPicker); setShowProgramPicker(false); }} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color="#2563eb" />
          <Text style={styles.pickerText}>{form.semester}</Text>
          <Ionicons name="chevron-down" size={16} color="#94a3b8" />
        </TouchableOpacity>
        {showSemesterPicker ? (
          <View style={styles.pickerList}>
            {SEMESTERS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pickerItem, form.semester === s && styles.pickerItemActive]}
                onPress={() => { updateField('semester', s); setShowSemesterPicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerItemText, form.semester === s && styles.pickerItemTextActive]}>{s}</Text>
                {form.semester === s ? <Ionicons name="checkmark" size={16} color="#2563eb" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Field label="Batch" icon="people-outline" value={form.batch} onChangeText={(v) => updateField('batch', v)} placeholder="e.g. Batch 2024" />

        <View style={styles.spacer} />
        <ActionButton
          label={student ? 'Update Student' : 'Create Student'}
          icon="checkmark"
          onPress={handleSave}
        />
      </ScrollView>
    </View>
  );
}

function Field({ label, icon, ...props }) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={16} color="#94a3b8" />
        <TextInput style={styles.input} placeholderTextColor="#cbd5e1" {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#2563eb',
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  fieldWrapper: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  input: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
    padding: 0,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: SPACING.sm,
  },
  pickerText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
  },
  pickerList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  pickerItemActive: {
    backgroundColor: '#2563eb0D',
  },
  pickerItemText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#475569',
    fontFamily: 'Manrope-Regular',
  },
  pickerItemTextActive: {
    color: '#2563eb',
    fontFamily: 'Manrope-SemiBold',
  },
  spacer: {
    height: SPACING.md,
  },
});