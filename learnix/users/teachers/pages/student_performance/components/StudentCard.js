import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function StudentCard({ student, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.studentInfo}>
          <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
            <Text style={[styles.avatarText, { color: student.avatarText }]}>{student.id}</Text>
          </View>
          <View>
            <Text style={styles.name}>{student.name}</Text>
            <Text style={styles.rank}>Rank #{student.rank} in Class</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: student.statusBg }]}>
            <Text style={[styles.statusText, { color: student.statusColor }]}>{student.status}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color="#c3c7cc" />
        </View>
      </View>

      {/* Grade & Trend */}
      <View style={styles.gradeSection}>
        <View>
          <Text style={styles.gradeLabel}>Grade Trend</Text>
          <View style={styles.gradeRow}>
            <Text style={styles.grade}>{student.grade}%</Text>
            <View style={styles.trend}>
              {student.trend.map((value, index) => (
                <View
                  key={index}
                  style={[
                    styles.trendBar,
                    {
                      height: `${value}%`,
                      backgroundColor: student.trendColor,
                      opacity: 0.4 + (value / 100) * 0.6,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
        <View style={styles.driver}>
          <Text style={styles.driverLabel}>Key Driver</Text>
          <Text style={[styles.driverValue, { color: student.driverColor }]}>{student.keyDriver}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#abadaf0d',
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  studentInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  name: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 2,
  },
  rank: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    fontWeight: '600',
    color: '#595c5e',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  gradeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  gradeLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grade: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '800',
    color: '#2c2f31',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 24,
    width: 96,
  },
  trendBar: {
    flex: 1,
    borderRadius: 1,
  },
  driver: {
    alignItems: 'flex-end',
  },
  driverLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  driverValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
  },
});
