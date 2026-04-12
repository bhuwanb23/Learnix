import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EVENT_DETAILS_COLORS } from '../constants/eventDetailsData';

export default function ScheduleSection({ schedule }) {
  const [expandedId, setExpandedId] = useState(3);

  const getColorStyle = (color) => {
    switch (color) {
      case 'primary':
        return { bg: `${EVENT_DETAILS_COLORS.primary}15`, text: EVENT_DETAILS_COLORS.primary, icon: EVENT_DETAILS_COLORS.primary };
      case 'secondary':
        return { bg: `${EVENT_DETAILS_COLORS.secondary}15`, text: EVENT_DETAILS_COLORS.secondary, icon: EVENT_DETAILS_COLORS.secondary };
      default:
        return { bg: `${EVENT_DETAILS_COLORS.primary}15`, text: EVENT_DETAILS_COLORS.primary, icon: EVENT_DETAILS_COLORS.primary };
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Schedule</Text>
      <View style={styles.scheduleList}>
        {schedule.map((item) => {
          const colors = getColorStyle(item.color);
          const isExpanded = expandedId === item.id;
          
          return (
            <View key={item.id} style={[
              styles.scheduleItem,
              isExpanded && { borderWidth: 2, borderColor: `${EVENT_DETAILS_COLORS.primary}25` }
            ]}>
              <TouchableOpacity 
                style={[styles.scheduleHeader, isExpanded && { backgroundColor: `${EVENT_DETAILS_COLORS.primary}08` }]}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.timeBlock}>
                  <View style={[styles.timeBadge, { backgroundColor: isExpanded ? EVENT_DETAILS_COLORS.primary : colors.bg }]}>
                    <Text style={[styles.timeText, { color: isExpanded ? EVENT_DETAILS_COLORS.onPrimary : colors.text }]}>{item.time}</Text>
                    <Text style={[styles.periodText, { color: isExpanded ? EVENT_DETAILS_COLORS.onPrimary : colors.text }]}>{item.period}</Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleTitle}>{item.title}</Text>
                    <Text style={styles.scheduleLocation}>{item.location}</Text>
                  </View>
                </View>
                <MaterialIcons 
                  name={isExpanded ? 'expand-less' : 'expand-more'} 
                  size={24} 
                  color={isExpanded ? EVENT_DETAILS_COLORS.primary : EVENT_DETAILS_COLORS.outline} 
                />
              </TouchableOpacity>
              {isExpanded && item.description && (
                <View style={styles.expandedContent}>
                  <Text style={styles.expandedText}>{item.description}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onSurface,
    marginBottom: 16,
  },
  scheduleList: {
    gap: 12,
  },
  scheduleItem: {
    backgroundColor: EVENT_DETAILS_COLORS.surfaceContainerLow,
    borderRadius: 16,
    overflow: 'hidden',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: EVENT_DETAILS_COLORS.surfaceContainerLowest,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  timeBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
  },
  periodText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onSurface,
    marginBottom: 4,
  },
  scheduleLocation: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: EVENT_DETAILS_COLORS.onSurfaceVariant,
  },
  expandedContent: {
    padding: 20,
    backgroundColor: EVENT_DETAILS_COLORS.surfaceContainerLowest,
  },
  expandedText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: EVENT_DETAILS_COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
});
