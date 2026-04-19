import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function Confirmation({ isConfirmed, onToggle }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.checkboxRow}
        activeOpacity={0.7}
        onPress={onToggle}
      >
        <View style={[styles.checkbox, isConfirmed && styles.checkboxChecked]}>
          {isConfirmed && (
            <MaterialIcons name="check" size={16} color="#ffffff" />
          )}
        </View>
        <Text style={styles.confirmationText}>
          I confirm that the information provided is accurate and I agree to the{' '}
          <Text style={styles.linkText}>Privacy Policy</Text> and{' '}
          <Text style={styles.linkText}>Terms of Service</Text>.
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#aab',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#0050d4',
    borderColor: '#0050d4',
  },
  confirmationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 22,
  },
  linkText: {
    color: '#0050d4',
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
  },
});
