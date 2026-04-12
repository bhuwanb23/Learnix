import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COMPLETED_RESULTS_COLORS } from '../constants/completedResultsData';

export default function CompetencyMapCard({ results }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Competency Map</Text>
      
      <View style={styles.radarContainer}>
        <Text style={[styles.radarLabel, styles.researchLabel]}>Research</Text>
        <Text style={[styles.radarLabel, styles.analysisLabel]}>Analysis</Text>
        <Text style={[styles.radarLabel, styles.criticalityLabel]}>Criticality</Text>
        <Text style={[styles.radarLabel, styles.structureLabel]}>Structure</Text>
        <Text style={[styles.radarLabel, styles.citingLabel]}>Citing</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Strongest Area</Text>
          <Text style={[styles.statValue, { color: COMPLETED_RESULTS_COLORS.primary }]}>
            {results.competencyMap.strongest}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Growth Area</Text>
          <Text style={[styles.statValue, { color: COMPLETED_RESULTS_COLORS.tertiary }]}>
            {results.competencyMap.growth}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COMPLETED_RESULTS_COLORS.surfaceContainerLow,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.onSurface,
    marginBottom: 24,
  },
  radarContainer: {
    height: 200,
    position: 'relative',
    marginBottom: 24,
  },
  radarLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Manrope-Bold',
  },
  researchLabel: {
    top: 0,
    left: '50%',
    transform: [{ translateX: -35 }],
  },
  analysisLabel: {
    top: '35%',
    right: 0,
  },
  criticalityLabel: {
    bottom: 0,
    right: '15%',
  },
  structureLabel: {
    bottom: 0,
    left: '15%',
  },
  citingLabel: {
    top: '35%',
    left: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COMPLETED_RESULTS_COLORS.surfaceContainerLowest,
    padding: 16,
    borderRadius: 8,
  },
  statLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: COMPLETED_RESULTS_COLORS.onSurfaceVariant,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
  },
});
