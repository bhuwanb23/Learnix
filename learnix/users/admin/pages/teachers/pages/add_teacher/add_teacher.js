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

const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Teaching Assistant'];
const AVAILABLE_CLASSES = [
  'CSE-A (Sem 5)',
  'CSE-B (Sem 5)',
  'ECE-A (Sem 3)',
  'ME-A (Sem 5)',
  'BBA-A (Sem 1)',
  'CIV-A (Sem 7)',
];

export default function AddTeacher({ teacher, onBack, onSave }) {
  const [form, setForm] = useState({
    name: teacher?.name || '',
    designation: teacher?.designation || 'Assistant Professor',
    department: teacher?.department || 'Computer Science',
    email: teacher?.email || '',
    phone: teacher?.phone || '',
    workload: teacher ? String(teacher.workload) : '18',
  });
  const [selectedClasses, setSelectedClasses] = useState(
    teacher ? ['CSE-A (Sem 5)', 'CSE-B (Sem 5)'] : []
  );
  const [showDesignationPicker, setShowDesignationPicker] = useState(false);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleClass = (cls) => {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Missing Fields', 'Please fill in name and email.');
      return;
    }
    if (selectedClasses.length === 0) {
      Alert.alert('No Classes', 'Assign at least one class to this teacher.');
      return;
    }
    Alert.alert(
      'Save Teacher',
      teacher ? 'Update this teacher record?' : 'Create this new teacher record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: teacher ? 'Update' : 'Create',
          onPress: () => {
            Alert.alert(
              'Success',
              `${teacher ? 'Teacher updated' : 'Teacher added'} with ${selectedClasses.length} assigned class(es).`,
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
            <Text style={styles.headerTitle}>{teacher ? 'Edit Teacher' : 'Add New Teacher'}</Text>
            <Text style={styles.headerSubtitle}>Fill in the details below</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Personal Details</Text>
        <Field label="Full Name" icon="person-outline" value={form.name} onChangeText={(v) => updateField('name', v)} placeholder="e.g. Dr. Meera Iyer" />
        <Field label="Email" icon="mail-outline" value={form.email} onChangeText={(v) => updateField('email', v)} placeholder="teacher@learnix.edu" keyboardType="email-address" />
        <Field label="Phone" icon="call-outline" value={form.phone} onChangeText={(v) => updateField('phone', v)} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
        <Field label="Department" icon="business-outline" value={form.department} onChangeText={(v) => updateField('department', v)} placeholder="e.g. Computer Science" />
        <Field label="Weekly Hours" icon="time-outline" value={form.workload} onChangeText={(v) => updateField('workload', v)} placeholder="e.g. 18" keyboardType="number-pad" />

        {/* Designation picker */}
        <Text style={styles.fieldLabel}>Designation</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowDesignationPicker(!showDesignationPicker)} activeOpacity={0.8}>
          <Ionicons name="ribbon-outline" size={16} color="#2563eb" />
          <Text style={styles.pickerText}>{form.designation}</Text>
          <Ionicons name="chevron-down" size={16} color="#94a3b8" />
        </TouchableOpacity>
        {showDesignationPicker ? (
          <View style={styles.pickerList}>
            {DESIGNATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.pickerItem, form.designation === d && styles.pickerItemActive]}
                onPress={() => { updateField('designation', d); setShowDesignationPicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerItemText, form.designation === d && styles.pickerItemTextActive]}>{d}</Text>
                {form.designation === d ? <Ionicons name="checkmark" size={16} color="#2563eb" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Assign Classes ({selectedClasses.length})</Text>
        {AVAILABLE_CLASSES.map((cls) => {
          const isSelected = selectedClasses.includes(cls);
          return (
            <TouchableOpacity
              key={cls}
              style={[styles.classRow, isSelected && styles.classRowActive]}
              onPress={() => toggleClass(cls)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={20}
                color={isSelected ? '#2563eb' : '#cbd5e1'}
              />
              <Text style={[styles.classRowText, isSelected && styles.classRowTextActive]}>{cls}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.spacer} />
        <ActionButton
          label={teacher ? 'Update Teacher' : 'Create Teacher'}
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
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  classRowActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb0D',
  },
  classRowText: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#475569',
    fontFamily: 'Manrope-Regular',
  },
  classRowTextActive: {
    color: '#2563eb',
    fontFamily: 'Manrope-SemiBold',
  },
  spacer: {
    height: SPACING.md,
  },
});