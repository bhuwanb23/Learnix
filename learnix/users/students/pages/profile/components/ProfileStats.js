import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileStats({ stats }) {
  const { width } = useWindowDimensions();
  
  const getCardWidth = () => {
    // Determine card width based on screen size for responsive grid
    if (width >= 1024) return '23%'; // 4 cols
    if (width >= 768) return '48%'; // 2 cols
    if (width >= 400) return '47%'; // 2 cols with less gap
    return '100%'; // 1 col for very small screens
  };

  const contentPadding = width >= 768 ? 32 : 16;

  return (
    <View style={[styles.container, { paddingHorizontal: contentPadding }]}>
      {/* Current CGPA */}
      <View style={[styles.statCard, { width: getCardWidth() }]}>
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
      <View style={[styles.statCard, { width: getCardWidth() }]}>
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
      <View style={[styles.statCard, { width: getCardWidth() }]}>
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
      <View style={[styles.statCard, { width: getCardWidth() }]}>
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
    marginTop: -32, // -mt-8
    flexDirection: 'row',
    flexWrap: 'wrap', // grid-cols-2 lg:grid-cols-4
    gap: 16, // gap-4
    justifyContent: 'space-between',
    zIndex: 10, // relative z-10
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    borderRadius: 12, // rounded-xl
    padding: 20, // slightly reduced padding
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1, // border
    borderColor: 'rgba(171, 173, 175, 0.1)', // border-outline-variant/10
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // mb-3
  },
  statLabel: {
    fontSize: 11, // text-xs slightly smaller
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
    fontSize: 22, // text-xl slightly reduced
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 4, // spacing between value and subtext
  },
  statSubtext: {
    fontSize: 11, // text-xs
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
  },
});
