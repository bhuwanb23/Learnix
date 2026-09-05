import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SPACING } from '../../../../constants/theme';

export default function SearchBar({ value, onChangeText, placeholder = 'Search...' }) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color="#94a3b8" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
      />
      {value ? (
        <Ionicons
          name="close-circle"
          size={18}
          color="#94a3b8"
          onPress={() => onChangeText('')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  input: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: '#1e293b',
    fontFamily: 'Manrope-Regular',
    padding: 0,
  },
});