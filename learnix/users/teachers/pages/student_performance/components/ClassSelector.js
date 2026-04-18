import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ClassSelector({ classInfo }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{classInfo.label}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{classInfo.name}</Text>
          <MaterialIcons name="expand-more" size={32} color="#0050d4" />
        </View>
        <Text style={styles.subtitle}>
          {classInfo.students} Students Enrolled • {classInfo.semester}
        </Text>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.exportButton} activeOpacity={0.85}>
          <Text style={styles.exportText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.notifyButton} activeOpacity={0.85}>
          <Text style={styles.notifyText}>Notify Class</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#0050d4',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.5,
    flex: 1,
  },
  subtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#595c5e',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#dfe3e6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#2c2f31',
  },
  notifyButton: {
    flex: 1,
    backgroundColor: '#0050d4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  notifyText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
