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

export default function SubjectProgress({ subjects, onSubjectPress }) {
  const handlePress = (subject) => {
    onSubjectPress(subject);
  };

  if (!subjects || subjects.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Subject Progress</Text>
      <View style={styles.subjectsList}>
        {subjects.map((subject, index) => (
          <View key={subject.id} style={styles.subjectWrapper}>
            <TouchableOpacity
              style={styles.subjectCard}
              onPress={() => handlePress(subject)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectInfo}>
                    <LinearGradient
                      colors={['#3B82F6', '#1E40AF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconContainer}
                    >
                      <Ionicons
                        name={subject.icon}
                        size={18}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <View style={styles.subjectDetails}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectChapter}>{subject.chapter}</Text>
                    </View>
                  </View>
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressPercentage}>
                      {subject.progress}%
                    </Text>
                    <View style={styles.progressCircle}>
                      <Ionicons name="trending-up" size={12} color="#3B82F6" />
                    </View>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${subject.progress}%`,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={['#3B82F6', '#1E40AF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.progressGradient}
                      />
                    </View>
                  </View>
                </View>

                {/* Decorative elements */}
                <View style={styles.decorativeShape} />
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
  subjectsList: {
    gap: SPACING.sm,
  },
  subjectWrapper: {
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  subjectCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: SPACING.sm,
    position: 'relative',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  subjectDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subjectChapter: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  progressContainer: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  progressPercentage: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#3B82F6',
  },
  progressCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 4,
  },
  decorativeShape: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    top: -15,
    right: -15,
  },
});
