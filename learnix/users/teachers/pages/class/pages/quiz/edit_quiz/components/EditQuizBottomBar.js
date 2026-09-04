import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function EditQuizBottomBar({ onCancel, onUpdate, saving }) {
  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.85}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.updateButton} onPress={onUpdate} activeOpacity={0.85} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.updateText}>Update Quiz</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#2c2f31',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  cancelText: {
    color: '#2c2f31',
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  updateButton: {
    backgroundColor: '#0050d4',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#0050d4',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  updateText: {
    color: '#fff',
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    fontWeight: '700',
  },
});