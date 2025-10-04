import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const SyllabusHeader = ({ 
  overallStats, 
  onBackPress, 
  onNotificationPress 
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Syllabus Tracker</Text>
        <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
          <Text style={styles.notificationIcon}>🔔</Text>
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Overall Progress</Text>
            <Text style={styles.summaryValue}>{overallStats.totalProgress}%</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryLabel}>Time Remaining</Text>
            <Text style={styles.summaryValue}>{overallStats.timeRemaining}</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${overallStats.totalProgress}%` }
              ]} 
            />
          </View>
        </View>
        
        <Text style={styles.progressText}>
          {overallStats.subjectsCompleted} of {overallStats.totalSubjects} subjects completed
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notificationButton: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default SyllabusHeader;
