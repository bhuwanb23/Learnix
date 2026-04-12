import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { UNIT_LIST_COLORS, UNIT_LIST_DATA, UNITS_DATA, MILESTONES_DATA, RESOURCES_DATA } from './constants/unitListData';
import UnitCard from './components/UnitCard';

export default function UnitListPage({ navigation, route }) {
  const [expandedUnit, setExpandedUnit] = useState(2); // Unit 2 is in progress, so expanded by default

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleUnitToggle = (unitId) => {
    setExpandedUnit(expandedUnit === unitId ? null : unitId);
  };

  const handleResourcePress = (resource) => {
    console.log('Resource pressed:', resource.title);
  };

  const handleMilestonePress = (milestone) => {
    console.log('Milestone pressed:', milestone.title);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={UNIT_LIST_COLORS.primary} translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={UNIT_LIST_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{UNIT_LIST_DATA.subjectName}</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Progress Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTextSection}>
              <Text style={styles.courseCode}>{UNIT_LIST_DATA.courseCode}</Text>
              <Text style={styles.heroTitle}>
                {UNIT_LIST_DATA.title}
                {'\n'}
                <Text style={styles.heroHighlight}>{UNIT_LIST_DATA.titleHighlight}</Text>
              </Text>
            </View>
            <View style={styles.completionSection}>
              <View style={styles.completionRow}>
                <Text style={styles.completionNumber}>{UNIT_LIST_DATA.completionPercentage}</Text>
                <Text style={styles.completionPercent}>%</Text>
              </View>
              <Text style={styles.completionLabel}>{UNIT_LIST_DATA.completionLabel}</Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${UNIT_LIST_DATA.completionPercentage}%` }
              ]} 
            />
          </View>
        </View>

        {/* Course Units Section */}
        <View style={styles.unitsSection}>
          <Text style={styles.sectionTitle}>Course Units</Text>
          {UNITS_DATA.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              isExpanded={expandedUnit === unit.id}
              onToggle={() => handleUnitToggle(unit.id)}
              onPress={() => navigation?.navigateToTopics && navigation.navigateToTopics(unit)}
            />
          ))}
        </View>

        {/* Deep Insights Section (Mobile Layout) */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Deep Insights</Text>
          
          {/* Study Velocity Card */}
          <View style={styles.velocityCard}>
            <Text style={styles.velocityLabel}>Study Velocity</Text>
            <View style={styles.velocityStats}>
              <Text style={styles.velocityNumber}>4.2</Text>
              <Text style={styles.velocityUnit}>hrs/day</Text>
            </View>
            <View style={styles.barChart}>
              <View style={[styles.bar, { height: 19 }]} />
              <View style={[styles.bar, { height: 29 }]} />
              <View style={[styles.bar, { height: 14 }]} />
              <View style={[styles.bar, { height: 41 }]} />
              <View style={[styles.bar, { height: 48 }]} />
            </View>
          </View>

          {/* Milestone Calendar */}
          <View style={styles.milestoneCard}>
            <Text style={styles.milestoneTitle}>Milestone Calendar</Text>
            {MILESTONES_DATA.map((milestone, index) => (
              <TouchableOpacity 
                key={milestone.id} 
                style={[
                  styles.milestoneItem,
                  index < MILESTONES_DATA.length - 1 && styles.milestoneItemBorder
                ]}
                onPress={() => handleMilestonePress(milestone)}
                activeOpacity={0.7}
              >
                <View style={[styles.milestoneDot, { backgroundColor: milestone.color }]} />
                <View style={styles.milestoneTextSection}>
                  <Text style={styles.milestoneDate}>{milestone.date}</Text>
                  <Text style={styles.milestoneText}>{milestone.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Curated Resources */}
          <View style={styles.resourcesCard}>
            <View style={styles.resourcesHeader}>
              <MaterialIcons name="auto-awesome" size={20} color={UNIT_LIST_COLORS.primary} />
              <Text style={styles.resourcesTitle}>Curated Resources</Text>
            </View>
            {RESOURCES_DATA.map((resource) => (
              <TouchableOpacity 
                key={resource.id} 
                style={styles.resourceItem}
                onPress={() => handleResourcePress(resource)}
                activeOpacity={0.7}
              >
                <View style={[styles.resourceIcon, { backgroundColor: resource.bgColor }]}>
                  <MaterialIcons name={resource.icon} size={18} color={resource.color} />
                </View>
                <Text style={styles.resourceTitle}>{resource.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UNIT_LIST_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: UNIT_LIST_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: `${UNIT_LIST_COLORS.outlineVariant}26`,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.primary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    gap: 16,
  },
  heroTextSection: {
    flex: 1,
  },
  courseCode: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_LIST_COLORS.secondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.onSurface,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  heroHighlight: {
    color: UNIT_LIST_COLORS.primary,
  },
  completionSection: {
    alignItems: 'flex-end',
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  completionNumber: {
    fontSize: 40,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.onSurface,
    letterSpacing: -1,
  },
  completionPercent: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.outline,
  },
  completionLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: UNIT_LIST_COLORS.onSurfaceVariant,
  },
  progressBarBg: {
    height: 16,
    backgroundColor: UNIT_LIST_COLORS.surfaceContainerHigh,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: UNIT_LIST_COLORS.primary,
    borderRadius: 999,
    shadowColor: UNIT_LIST_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  unitsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.onSurface,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  insightsSection: {
    marginBottom: 16,
  },
  velocityCard: {
    backgroundColor: UNIT_LIST_COLORS.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  velocityLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: `${UNIT_LIST_COLORS.onSecondary}B3`,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  velocityStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 20,
  },
  velocityNumber: {
    fontSize: 36,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.onSecondary,
    letterSpacing: -1,
  },
  velocityUnit: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: `${UNIT_LIST_COLORS.onSecondary}CC`,
    paddingBottom: 4,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 48,
  },
  bar: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  milestoneCard: {
    backgroundColor: UNIT_LIST_COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.onSurface,
    marginBottom: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  milestoneItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: `${UNIT_LIST_COLORS.outlineVariant}1A`,
  },
  milestoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  milestoneTextSection: {
    flex: 1,
    paddingBottom: 10,
  },
  milestoneDate: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_LIST_COLORS.onSurfaceVariant,
    marginBottom: 4,
  },
  milestoneText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: UNIT_LIST_COLORS.onSurface,
  },
  resourcesCard: {
    backgroundColor: `${UNIT_LIST_COLORS.surfaceContainerLowest}B3`,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  resourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  resourcesTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_LIST_COLORS.onSurface,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: UNIT_LIST_COLORS.surface,
    borderRadius: 8,
    marginBottom: 10,
  },
  resourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resourceTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_LIST_COLORS.onSurface,
    flex: 1,
  },
});
