import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function CoverLetter({ value, onChangeText }) {
  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="edit" size={22} color="#a23800" />
          </View>
          <Text style={styles.sectionTitle}>Cover Letter</Text>
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder="Tell us why you are a great fit for Lumina..."
          placeholderTextColor="#aab"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#eef1f3',
    borderRadius: 16,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(162, 56, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#2c2f31',
  },
  textArea: {
    minHeight: 160,
    paddingTop: 18,
  },
});
