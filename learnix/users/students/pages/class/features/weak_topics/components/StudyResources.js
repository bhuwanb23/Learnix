import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function StudyResources({ resources, onResourceClick }) {
  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recommended Resources</Text>
      
      <View style={styles.resourcesContainer}>
        {resources.map((resource) => (
          <TouchableOpacity
            key={resource.id}
            style={styles.resourceCard}
            onPress={() => onResourceClick?.(resource)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              style={styles.cardGradient}
            >
              <View style={styles.resourceContent}>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: resource.iconBg }]}>
                  <Ionicons 
                    name={resource.icon} 
                    size={20} 
                    color={resource.iconColor} 
                  />
                </View>
                
                {/* Content */}
                <View style={styles.textContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <Ionicons 
                      name="open-outline" 
                      size={14} 
                      color={COLORS.textSecondary} 
                    />
                  </View>
                  
                  <Text style={styles.resourceDescription}>
                    {resource.description}
                  </Text>
                  
                  <View style={styles.metaInfo}>
                    <View style={styles.durationBadge}>
                      <Ionicons 
                        name="time-outline" 
                        size={12} 
                        color="#3B82F6" 
                      />
                      <Text style={styles.durationText}>{resource.duration}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Hover Effect Indicator */}
              <View style={styles.hoverIndicator} />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  resourcesContainer: {
    gap: SPACING.md,
  },
  resourceCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGradient: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: BORDER_RADIUS.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  resourceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  resourceTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary,
    flex: 1,
  },
  resourceDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: SPACING.sm,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#EBF4FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  durationText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#3B82F6',
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  hoverIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    backgroundColor: '#3B82F6',
    opacity: 0,
  },
});
