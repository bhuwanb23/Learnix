import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function DashboardHeader({ title }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} activeOpacity={0.7}>
        <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f5f7f9',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    letterSpacing: -0.3,
  },
});
