import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function EditQuizDangerZone({ onDelete }) {
  return (
    <View style={styles.dangerZone}>
      <View style={styles.dangerContent}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDesc}>Permanently remove this quiz and all student attempts.</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.85}>
        <Text style={styles.deleteButtonText}>Delete Quiz</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  dangerZone: {
    backgroundColor: '#fb5151',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#b31b25',
    opacity: 0.95,
  },
  dangerContent: {
    flex: 1,
  },
  dangerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: '#9f0519',
    fontWeight: '700',
    marginBottom: 4,
  },
  dangerDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#2c2f31',
    opacity: 0.8,
  },
  deleteButton: {
    backgroundColor: '#b31b25',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 16,
  },
  deleteButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
});