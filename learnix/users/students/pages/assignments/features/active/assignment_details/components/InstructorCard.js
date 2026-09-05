import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function InstructorCard({ assignment }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Instructor</Text>
      <View style={styles.instructorRow}>
        <Image source={{ uri: assignment.instructor.avatar }} style={styles.avatar} />
        <View style={styles.instructorInfo}>
          <Text style={styles.instructorName}>{assignment.instructor.name}</Text>
          <Text style={styles.instructorTitle}>{assignment.instructor.title}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.messageButton} onPress={() => Alert.alert('Message Instructor', `Opening a chat with ${assignment.instructor.name}…`)}>
        <MaterialIcons name="mail" size={18} color={ACTIVE_ASSIGNMENT_COLORS.onSurface} />
        <Text style={styles.messageButtonText}>Message Instructor</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerLowest,
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  instructorInfo: {
    gap: 4,
  },
  instructorName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
  },
  instructorTitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
  },
  messageButton: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  messageButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
  },
});
