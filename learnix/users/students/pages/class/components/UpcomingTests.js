import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function UpcomingTests({ tests, onTestPress }) {
  const handlePress = (test) => {
    onTestPress(test);
  };

  if (!tests || tests.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Upcoming Tests</Text>
      <View style={styles.testsList}>
        {tests.map((test, index) => (
          <View key={test.id} style={styles.testWrapper}>
            <TouchableOpacity
              style={styles.testCard}
              onPress={() => handlePress(test)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.testContent}>
                  <View style={styles.testInfo}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="document-text"
                        size={16}
                        color="#3B82F6"
                      />
                    </View>
                    <View style={styles.testDetails}>
                      <Text style={styles.testSubject}>{test.subject}</Text>
                      <View style={styles.dateContainer}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.testDate}>{test.date}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: test.priorityBg }]}>
                    <Text style={[styles.priorityText, { color: test.priorityColor }]}>
                      {test.priorityText}
                    </Text>
                  </View>
                </View>
                
                {/* Decorative element */}
                <View style={[styles.decorativeLine, { backgroundColor: test.priorityColor }]} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  testsList: {
    gap: SPACING.sm,
  },
  testWrapper: {
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  testCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: SPACING.sm,
    position: 'relative',
  },
  testContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  testDetails: {
    flex: 1,
  },
  testSubject: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  testDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  decorativeLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
  },
});
