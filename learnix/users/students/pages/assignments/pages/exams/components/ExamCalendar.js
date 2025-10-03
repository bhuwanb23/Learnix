import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function ExamCalendar({ calendarData, onDayPress }) {
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const renderDayCell = (day, weekIndex, dayIndex) => {
    const hasEvent = day.events && day.events.length > 0;
    const eventType = hasEvent ? day.events[0].type : null;
    
    const getEventColor = (type) => {
      switch (type) {
        case 'online': return '#4F46E5';
        case 'offline': return '#2563EB';
        case 'practice': return '#059669';
        case 'completed': return '#10B981';
        default: return COLORS.primary;
      }
    };

    return (
      <TouchableOpacity
        key={`${weekIndex}-${dayIndex}`}
        style={[
          styles.dayCell,
          hasEvent && { backgroundColor: getEventColor(eventType), borderRadius: BORDER_RADIUS.lg },
          day === 15 && { backgroundColor: '#4F46E5', borderRadius: BORDER_RADIUS.lg }
        ]}
        onPress={() => onDayPress(day)}
      >
        <Text style={[
          styles.dayText,
          { color: hasEvent ? COLORS.white : (day.isCurrentMonth ? COLORS.textPrimary : COLORS.textTertiary) }
        ]}>
          {typeof day === 'object' ? day.day : day}
        </Text>
        {hasEvent && (
          <View style={[
            styles.eventDot,
            { backgroundColor: COLORS.white }
          ]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderLegend = () => (
    <View style={styles.legendContainer}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#4F46E5' }]} />
        <Text style={styles.legendText}>Online Exam</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
        <Text style={styles.legendText}>Offline Exam</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
        <Text style={styles.legendText}>Practice Test</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.monthTitle}>{calendarData.month}</Text>
        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="chevron-back-outline" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="chevron-forward-outline" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.weekHeader}>
          {daysOfWeek.map((day, index) => (
            <Text key={index} style={styles.dayHeader}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarData.weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.days.map((day, dayIndex) => renderDayCell(day, weekIndex, dayIndex))}
            </View>
          ))}
        </View>
      </View>

      {renderLegend()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  monthTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  navButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  calendarContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textSecondary,
    padding: SPACING.sm,
  },
  calendarGrid: {
    gap: 2,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  eventDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  legendContainer: {
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
  },
  legendText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
  },
});
