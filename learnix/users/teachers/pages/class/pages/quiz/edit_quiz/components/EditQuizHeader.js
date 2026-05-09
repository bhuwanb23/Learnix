import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function EditQuizHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Quiz</Text>
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <MaterialIcons name="more-vert" size={24} color="#2c2f31" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#0050d4',
    flex: 1,
    textAlign: 'center',
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
});
