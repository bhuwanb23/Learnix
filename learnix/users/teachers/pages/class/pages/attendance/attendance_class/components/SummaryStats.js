import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SummaryStats = ({ stats }) => {
  if (!stats) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2563EB', '#1E40AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientCard}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Today's Classes</Text>
            <Text style={styles.statValue}>{stats.totalClasses}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg Attendance</Text>
            <Text style={styles.statValue}>{stats.averageAttendance}%</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 16
  },
  gradientCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 14,
    color: '#DBEAFE',
    marginBottom: 4,
    fontWeight: '500'
  },
  statValue: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold'
  }
});

export default SummaryStats;
