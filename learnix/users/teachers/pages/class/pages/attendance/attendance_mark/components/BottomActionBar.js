import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const BottomActionBar = ({ 
  onSave, 
  saving = false 
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.saveButton}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <View style={styles.saveButtonGradient}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8
  },
  saveButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  saveButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});

export default BottomActionBar;
