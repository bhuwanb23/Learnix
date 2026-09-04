import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
export default function CreateUnit({ route, navigation }) {
  const classData = route?.params?.classData || null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unitNumber, setUnitNumber] = useState('03');

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give the unit a title before saving.');
      return;
    }
    Alert.alert('Unit Created', `"${title.trim()}" was added to the quiz module.`, [
      { text: 'OK', onPress: () => handleBack() },
    ]);
  };

  const canSave = title.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Create New Unit</Text>
          <Text style={styles.subtitle}>{classData?.title || 'Quiz module'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Unit Number</Text>
          <View style={styles.numberRow}>
            {['01', '02', '03', '04', '05'].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.chip, unitNumber === num && styles.chipActive]}
                onPress={() => setUnitNumber(num)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, unitNumber === num && styles.chipTextActive]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Unit Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Neural Network Architectures"
            placeholderTextColor="#abadaf"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What does this unit cover?"
            placeholderTextColor="#abadaf"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85} disabled={!canSave}>
          <MaterialIcons name="check" size={18} color={canSave ? '#ffffff' : '#a7adb4'} />
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>Create Unit</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e9eb',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
  },
  subtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#8a8f94',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e8ec',
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#595c5e',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f7f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#2c2f31',
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  numberRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    width: 48,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eef1f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#702ae1',
  },
  chipText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#595c5e',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e8ec',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#702ae1',
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  saveTextDisabled: {
    color: '#ffffff',
    opacity: 0.5,
  },
});