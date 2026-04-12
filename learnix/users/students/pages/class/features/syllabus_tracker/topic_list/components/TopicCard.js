import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TOPIC_LIST_COLORS } from '../constants/topicListData';

export default function TopicCard({ topic, onPress, onMorePress }) {
  const renderCheckbox = () => {
    if (topic.isCompleted) {
      return (
        <View style={[styles.checkbox, styles.checkboxCompleted]}>
          <MaterialIcons name="check" size={20} color="#ffffff" />
        </View>
      );
    }
    
    if (topic.isInProgress) {
      return (
        <View style={[styles.checkbox, styles.checkboxInProgress]} />
      );
    }
    
    // Not started
    return (
      <View style={[styles.checkbox, styles.checkboxNotStarted]} />
    );
  };

  const getTitleStyle = () => {
    if (topic.isCompleted) {
      return styles.titleCompleted;
    }
    return styles.titleDefault;
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={styles.checkboxWrapper}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {renderCheckbox()}
        </TouchableOpacity>
        <View style={styles.textSection}>
          <Text style={[styles.title, getTitleStyle()]}>{topic.title}</Text>
          <Text style={styles.description}>{topic.description}</Text>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <View style={[styles.statusBadge, { backgroundColor: topic.statusBg }]}>
          {topic.statusDotColor && (
            <View style={[styles.statusDot, { backgroundColor: topic.statusDotColor }]} />
          )}
          <Text style={[styles.statusText, { color: topic.statusColor }]}>{topic.status}</Text>
        </View>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={onMorePress}
          activeOpacity={0.7}
        >
          <MaterialIcons name="more-vert" size={20} color={TOPIC_LIST_COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOPIC_LIST_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  checkboxWrapper: {
    flexShrink: 0,
  },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: TOPIC_LIST_COLORS.primary,
    borderColor: TOPIC_LIST_COLORS.primary,
  },
  checkboxInProgress: {
    backgroundColor: 'transparent',
    borderColor: TOPIC_LIST_COLORS.primaryContainer,
  },
  checkboxNotStarted: {
    backgroundColor: 'transparent',
    borderColor: `${TOPIC_LIST_COLORS.outlineVariant}4D`,
  },
  textSection: {
    flex: 1,
    gap: 4,
  },
  titleDefault: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_LIST_COLORS.onSurface,
    lineHeight: 22,
  },
  titleCompleted: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_LIST_COLORS.onSurface,
    lineHeight: 22,
    opacity: 0.6,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: TOPIC_LIST_COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.5,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOPIC_LIST_COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
