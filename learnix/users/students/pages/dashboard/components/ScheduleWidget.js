import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../constants/dashboardData';

export default function ScheduleWidget({ scheduleData }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Schedule</Text>
        <Text style={styles.clockIcon}>🕐</Text>
      </View>

      <View style={styles.scheduleList}>
        {scheduleData.map((classItem, index) => (
          <ScheduleItem
            key={classItem.id}
            classItem={classItem}
            isLast={index === scheduleData.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function ScheduleItem({ classItem, isLast }) {
  const isActive = classItem.isActive;
  const isNext = classItem.status === 'next';

  return (
    <View style={[
      styles.scheduleItem,
      isActive && styles.activeScheduleItem,
      !isLast && styles.scheduleItemBorder,
    ]}>
      <View style={[
        styles.leftBorder,
        isActive && styles.activeLeftBorder,
      ]} />
      
      <View style={styles.content}>
        <View style={styles.classInfo}>
          <Text style={[
            styles.className,
            isActive && styles.activeClassName,
          ]}>
            {classItem.subject}
          </Text>
          <Text style={styles.classDetails}>
            {classItem.room} • {classItem.professor}
          </Text>
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={[
            styles.time,
            isActive && styles.activeTime,
          ]}>
            {classItem.time}
          </Text>
          {isNext && (
            <Text style={styles.nextLabel}>Next</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  clockIcon: {
    fontSize: 18,
    color: COLORS.blue[500],
  },
  scheduleList: {
    gap: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
  },
  activeScheduleItem: {
    backgroundColor: COLORS.blue[50],
  },
  scheduleItemBorder: {
    marginBottom: 12,
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  activeLeftBorder: {
    backgroundColor: COLORS.blue[500],
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 8,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  activeClassName: {
    color: COLORS.gray[800],
    fontWeight: '600',
  },
  classDetails: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  activeTime: {
    color: COLORS.blue[600],
    fontWeight: '600',
  },
  nextLabel: {
    fontSize: 12,
    color: COLORS.blue[600],
    fontWeight: '500',
    marginTop: 2,
  },
});
