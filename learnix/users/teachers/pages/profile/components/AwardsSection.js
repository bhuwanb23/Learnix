import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AwardsSection({ awards }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Honors & Awards</Text>
      <View style={styles.grid}>
        {awards.map((award) => (
          <View key={award.id} style={[styles.awardCard, { borderLeftColor: award.color }]}>
            <MaterialIcons name={award.icon} size={32} color={award.color} />
            <View style={styles.content}>
              <Text style={styles.awardTitle}>{award.title}</Text>
              <Text style={styles.awardOrg}>{award.organization}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  awardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eef1f3',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  content: {
    flex: 1,
  },
  awardTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 2,
  },
  awardOrg: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: '#595c5e',
  },
});
