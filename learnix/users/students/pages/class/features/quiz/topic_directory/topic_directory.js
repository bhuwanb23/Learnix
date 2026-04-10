import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOPIC_DIRECTORY_COLORS, UNIT_DETAIL_DATA, TOPICS_DATA, MASTERY_INSIGHT_DATA } from './constants/topicDirectoryData';
import TopicCard from './components/TopicCard';
import MasteryInsight from './components/MasteryInsight';

export default function TopicDirectoryPage({ navigation, route }) {
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleTopicPress = (topic) => {
    console.log('Topic pressed:', topic.title);
    if (navigation?.navigateToForm) {
      navigation.navigateToForm(topic);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2563eb" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={TOPIC_DIRECTORY_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Unit: {UNIT_DETAIL_DATA.title}</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Curriculum Modules</Text>
            <Text style={styles.heroTitle}>
              Select Your {'\n'}Next Challenge
            </Text>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressIcon}>
              <Ionicons name="analytics" size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <Text style={styles.progressValue}>{UNIT_DETAIL_DATA.progress}% Mastered</Text>
            </View>
          </View>
        </View>

        {/* Topic Cards */}
        <View style={styles.topicsGrid}>
          {TOPICS_DATA.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onPress={() => handleTopicPress(topic)}
              onButtonPress={() => handleTopicPress(topic)}
            />
          ))}
        </View>

        {/* Mastery Insight */}
        <MasteryInsight data={MASTERY_INSIGHT_DATA} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOPIC_DIRECTORY_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    backgroundColor: TOPIC_DIRECTORY_COLORS.surface,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_DIRECTORY_COLORS.onSurface,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroSection: {
    marginBottom: 20,
  },
  heroContent: {
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_DIRECTORY_COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_DIRECTORY_COLORS.onSurface,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  progressCard: {
    backgroundColor: TOPIC_DIRECTORY_COLORS.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TOPIC_DIRECTORY_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: TOPIC_DIRECTORY_COLORS.onSurfaceVariant,
    marginBottom: 2,
  },
  progressValue: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_DIRECTORY_COLORS.onSurface,
  },
  topicsGrid: {
    marginBottom: 16,
  },
});
