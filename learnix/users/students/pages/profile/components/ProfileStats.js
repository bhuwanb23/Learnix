import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileStats({ stats }) {
  return (
    <View style={styles.container}>
      {/* Current CGPA */}
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Text style={styles.statLabel}>Current CGPA</Text>
          <MaterialIcons name="trending-up" size={16} color="#059669" />
        </View>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{stats.cgpa.toFixed(2)}</Text>
          <Text style={styles.statSubtext}>{stats.cgpaTrend}</Text>
        </View>
      </View>

      {/* Attendance */}
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Text style={styles.statLabel}>Attendance</Text>
          <MaterialIcons name="check-circle" size={16} color="#0050d4" />
        </View>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{stats.attendance}%</Text>
          <Text style={styles.statSubtext}>{stats.attendanceStatus}</Text>
        </View>
      </View>

      {/* Credits Earned */}
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Text style={styles.statLabel}>Credits Earned</Text>
          <MaterialIcons name="library-books" size={16} color="#9333ea" />
        </View>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{stats.creditsEarned}</Text>
          <Text style={styles.statSubtext}>/ {stats.creditsTotal} Total</Text>
        </View>
      </View>

      {/* Class Rank */}
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Text style={styles.statLabel}>Class Rank</Text>
          <MaterialIcons name="emoji-events" size={16} color="#d97706" />
        </View>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{stats.rank}</Text>
          <Text style={styles.statSubtext}>{stats.rankDetails}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24, // px-6
    marginTop: -32, // -mt-8
    flexDirection: 'row',
    flexWrap: 'wrap', // grid-cols-2 lg:grid-cols-4
    gap: 16, // gap-4
    zIndex: 10, // relative z-10
  },
  statCard: {
    width: '47%', // roughly half width minus gap for 2 cols mobile
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    borderRadius: 12, // rounded-xl
    padding: 24, // p-6
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1, // border
    borderColor: 'rgba(171, 173, 175, 0.1)', // border-outline-variant/10
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // mb-4
  },
  statLabel: {
    fontSize: 12, // text-xs
    fontWeight: '700', // font-bold
    color: '#595c5e', // text-on-surface-variant
    textTransform: 'uppercase', // uppercase
    letterSpacing: 0.5, // tracking-wider
    fontFamily: 'Manrope-Bold',
  },
  statValueRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 4, // spacing between value and subtext
  },
  statSubtext: {
    fontSize: 12, // text-xs
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
  },
});
