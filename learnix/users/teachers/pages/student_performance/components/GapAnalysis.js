import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function GapAnalysis({ gaps }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="warning" size={24} color="#a23800" />
        <Text style={styles.title}>Gap Analysis</Text>
      </View>
      <View style={styles.content}>
        {gaps.map((gap) => (
          <View key={gap.id} style={styles.gapItem}>
            <View style={styles.gapHeader}>
              <Text style={styles.topic}>{gap.topic}</Text>
              <Text style={[styles.mastery, { color: gap.color }]}>{gap.mastery}% Mastery</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${gap.mastery}%`,
                    backgroundColor: gap.color,
                  },
                ]}
              />
            </View>
            {gap.note && <Text style={styles.note}>{gap.note}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.3,
  },
  content: {
    backgroundColor: '#eef1f3',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 20,
  },
  gapItem: {
    marginBottom: 20,
  },
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topic: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
  },
  mastery: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#d9dde0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  note: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 9,
    fontWeight: '600',
    color: '#595c5e',
    textTransform: 'uppercase',
  },
});
