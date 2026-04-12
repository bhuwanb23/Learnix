import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COMPLETED_RESULTS_COLORS } from '../constants/completedResultsData';

export default function CompetencyMapCard({ results }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Competency Map</Text>
      
      <View style={styles.radarContainer}>
        {/* Radar Grid Circles */}
        <View style={[styles.radarGrid, styles.outerGrid]} />
        <View style={[styles.radarGrid, styles.middleGrid]} />
        <View style={[styles.radarGrid, styles.innerGrid]} />
        
        {/* Radar Labels */}
        <Text style={[styles.radarLabel, styles.researchLabel]}>Research</Text>
        <Text style={[styles.radarLabel, styles.analysisLabel]}>Analysis</Text>
        <Text style={[styles.radarLabel, styles.criticalityLabel]}>Criticality</Text>
        <Text style={[styles.radarLabel, styles.structureLabel]}>Structure</Text>
        <Text style={[styles.radarLabel, styles.citingLabel]}>Citing</Text>
        
        {/* Performance Polygon */}
        <View style={styles.polygonContainer}>
          <View style={styles.performancePolygon} />
        </View>
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
    padding: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.onSurface,
    marginBottom: 16,
  },
  radarContainer: {
    height: 150,
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarGrid: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COMPLETED_RESULTS_COLORS.outlineVariant}30`,
  },
  outerGrid: {
    width: 120,
    height: 120,
  },
  middleGrid: {
    width: 80,
    height: 80,
  },
  innerGrid: {
    width: 40,
    height: 40,
  },
  polygonContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
  },
  performancePolygon: {
    width: '100%',
    height: '100%',
    backgroundColor: `${COMPLETED_RESULTS_COLORS.primary}20`,
    borderWidth: 2,
    borderColor: COMPLETED_RESULTS_COLORS.primary,
    transform: [
      { rotate: '45deg' },
      { skewX: '10deg' },
      { skewY: '10deg' },
    ],
  },
  radarLabel: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Manrope-Bold',
    zIndex: 10,
  },
  researchLabel: {
    top: 0,
    left: '50%',
    transform: [{ translateX: -28 }],
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
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COMPLETED_RESULTS_COLORS.surfaceContainerLowest,
    padding: 12,
    borderRadius: 8,
  },
  statLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 9,
    fontWeight: '500',
    color: COMPLETED_RESULTS_COLORS.onSurfaceVariant,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
  },
});
