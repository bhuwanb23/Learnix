import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UNIT_LIST_COLORS } from '../constants/unitListData';

export default function UnitCard({ unit, isExpanded, onToggle, onPress }) {
  const renderStatusIcon = () => {
    if (unit.isCompleted) {
      return (
        <TouchableOpacity style={styles.statusIconContainer} activeOpacity={0.7}>
          <MaterialIcons name="check-circle" size={20} color={UNIT_LIST_COLORS.primary} />
        </TouchableOpacity>
      );
    }
    
    if (unit.isInProgress) {
      return (
        <TouchableOpacity 
          style={styles.radioButton}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name={isExpanded ? "radio-button-checked" : "radio-button-unchecked"} 
            size={18} 
            color={isExpanded ? UNIT_LIST_COLORS.primary : UNIT_LIST_COLORS.outline} 
          />
        </TouchableOpacity>
      );
    }
    
    // Not started - show circle outline
    return (
      <TouchableOpacity style={styles.statusIconContainer} activeOpacity={0.7}>
        <MaterialIcons name="radio-button-unchecked" size={20} color={UNIT_LIST_COLORS.outlineVariant} />
      </TouchableOpacity>
    );
  };

  const renderTopics = () => {
    if (!unit.topics || !isExpanded) return null;

    return (
      <View style={styles.topicsContainer}>
        {unit.topics.map((topic) => (
          <TouchableOpacity 
            key={topic.id} 
            style={styles.topicItem}
            activeOpacity={0.7}
          >
            <View style={styles.topicLeft}>
              <MaterialIcons name={topic.icon} size={18} color={UNIT_LIST_COLORS.primary} />
              <Text style={styles.topicTitle}>{topic.title}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={UNIT_LIST_COLORS.outline} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getCardStyle = () => {
    if (unit.isInProgress && isExpanded) {
      return styles.cardExpanded;
    }
    return styles.cardDefault;
  };

  const getIconContainerStyle = () => {
    if (unit.isInProgress && isExpanded) {
      return styles.iconContainerActive;
    }
    if (unit.isCompleted) {
      return styles.iconContainerCompleted;
    }
    return styles.iconContainerDefault;
  };

  return (
    <TouchableOpacity 
      style={[styles.container, getCardStyle()]}
      onPress={onPress || (unit.isInProgress ? onToggle : undefined)}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, getIconContainerStyle()]}>
            <MaterialIcons 
              name={unit.icon} 
              size={22} 
              color={unit.isInProgress && isExpanded ? UNIT_LIST_COLORS.onPrimaryContainer : UNIT_LIST_COLORS.primary} 
            />
          </View>
          <View style={styles.textSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{unit.number}. {unit.title}</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: unit.statusBg }]}>
                <Text style={[styles.statusText, { color: unit.statusColor }]}>{unit.status}</Text>
              </View>
            </View>
            <Text style={styles.description}>{unit.description}</Text>
          </View>
        </View>
        {renderStatusIcon()}
      </View>
      {renderTopics()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: UNIT_LIST_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardDefault: {
    shadowOpacity: 0.04,
  },
  cardExpanded: {
    borderWidth: 2,
    borderColor: `${UNIT_LIST_COLORS.primary}1A`,
    shadowOpacity: 0.08,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  leftSection: {
    flexDirection: 'row',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconContainerDefault: {
    backgroundColor: UNIT_LIST_COLORS.surfaceContainerLow,
  },
  iconContainerActive: {
    backgroundColor: UNIT_LIST_COLORS.primaryContainer,
  },
  iconContainerCompleted: {
    backgroundColor: UNIT_LIST_COLORS.secondaryContainer,
  },
  textSection: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.onSurface,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: UNIT_LIST_COLORS.onSurfaceVariant,
    lineHeight: 19,
  },
  statusIconContainer: {
    marginLeft: 6,
    marginTop: 2,
  },
  radioButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: UNIT_LIST_COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    marginTop: 2,
  },
  topicsContainer: {
    backgroundColor: UNIT_LIST_COLORS.surfaceContainerLow,
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: UNIT_LIST_COLORS.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${UNIT_LIST_COLORS.outlineVariant}1A`,
  },
  topicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: UNIT_LIST_COLORS.onSurface,
  },
});
