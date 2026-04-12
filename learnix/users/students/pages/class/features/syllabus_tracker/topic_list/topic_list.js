import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { TOPIC_LIST_COLORS, TOPIC_LIST_DATA, TOPICS_DATA, RESOURCES_DATA } from './constants/topicListData';
import TopicCard from './components/TopicCard';

export default function TopicListPage({ navigation, route }) {
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleTopicPress = (topic) => {
    if (navigation?.navigateToTracker) {
      navigation.navigateToTracker(topic);
    }
  };

  const handleMorePress = (topic) => {
    console.log('More options for:', topic.title);
  };

  const handleStartChallenge = () => {
    console.log('Starting challenge');
  };

  const handleVideoPress = () => {
    console.log('Opening video');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={TOPIC_LIST_COLORS.primary} translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={TOPIC_LIST_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Topic Tracker</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.unitLabelRow}>
            <Text style={styles.unitLabel}>{TOPIC_LIST_DATA.unitNumber}</Text>
            <View style={styles.unitLabelLine} />
          </View>
          <Text style={styles.heroTitle}>{TOPIC_LIST_DATA.unitTitle}</Text>
          <Text style={styles.heroDescription}>{TOPIC_LIST_DATA.description}</Text>
        </View>

        {/* Progress Overview Cards */}
        <View style={styles.progressSection}>
          <View style={styles.progressMainCard}>
            <View style={styles.progressContent}>
              <Text style={styles.progressLabel}>Overall Unit Progress</Text>
              <Text style={styles.progressNumber}>{TOPIC_LIST_DATA.progressPercentage}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${TOPIC_LIST_DATA.progressPercentage}%` }
                ]} 
              />
            </View>
            <View style={styles.progressBgCircle1} />
            <View style={styles.progressBgCircle2} />
          </View>
        </View>

        {/* Topic Cards */}
        <View style={styles.topicsSection}>
          {TOPICS_DATA.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onPress={() => handleTopicPress(topic)}
              onMorePress={() => handleMorePress(topic)}
            />
          ))}
        </View>

        {/* Learning Resources */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Learning Resources</Text>
          
          {/* Video Resource */}
          <TouchableOpacity 
            style={styles.videoCard}
            onPress={handleVideoPress}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: RESOURCES_DATA.video.imageUrl }}
              style={styles.videoImage}
            />
            <View style={styles.videoOverlay}>
              <Text style={styles.videoType}>{RESOURCES_DATA.video.type}</Text>
              <Text style={styles.videoTitle}>{RESOURCES_DATA.video.title}</Text>
            </View>
          </TouchableOpacity>

          {/* Challenge Card */}
          <View style={styles.challengeCard}>
            <View>
              <MaterialIcons name="quiz" size={40} color={TOPIC_LIST_COLORS.onSecondary} style={styles.challengeIcon} />
              <Text style={styles.challengeCardTitle}>Practice Challenge</Text>
              <Text style={styles.challengeDescription}>{RESOURCES_DATA.challenge.title}</Text>
            </View>
            <TouchableOpacity 
              style={styles.challengeButton}
              onPress={handleStartChallenge}
              activeOpacity={0.8}
            >
              <Text style={styles.challengeButtonText}>{RESOURCES_DATA.challenge.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOPIC_LIST_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: TOPIC_LIST_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: `${TOPIC_LIST_COLORS.outlineVariant}26`,
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
    color: TOPIC_LIST_COLORS.primary,
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
  unitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  unitLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_LIST_COLORS.primary,
    letterSpacing: 2,
  },
  unitLabelLine: {
    width: 48,
    height: 4,
    backgroundColor: TOPIC_LIST_COLORS.primaryContainer,
    borderRadius: 999,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_LIST_COLORS.onSurface,
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: TOPIC_LIST_COLORS.onSurfaceVariant,
    lineHeight: 24,
  },
  progressSection: {
    gap: 14,
    marginBottom: 32,
  },
  progressMainCard: {
    backgroundColor: TOPIC_LIST_COLORS.primary,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-between',
    minHeight: 140,
    overflow: 'hidden',
  },
  progressContent: {
    zIndex: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: `${TOPIC_LIST_COLORS.onPrimary}CC`,
    marginBottom: 4,
  },
  progressNumber: {
    fontSize: 40,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    letterSpacing: -1,
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    marginTop: 12,
    zIndex: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  progressBgCircle1: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBgCircle2: {
    position: 'absolute',
    right: 60,
    top: 0,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${TOPIC_LIST_COLORS.primaryContainer}33`,
  },
  studyTimeCard: {
    backgroundColor: TOPIC_LIST_COLORS.secondary,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-between',
    minHeight: 140,
    overflow: 'hidden',
    position: 'relative',
  },
  studyTimeContent: {
    zIndex: 10,
  },
  studyTimeLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: `${TOPIC_LIST_COLORS.onSecondary}CC`,
    marginBottom: 4,
  },
  studyTimeNumber: {
    fontSize: 40,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    letterSpacing: -1,
  },
  studyTimeBgCircle: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  topicsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_LIST_COLORS.onSurface,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  resourcesSection: {
    marginBottom: 16,
  },
  videoCard: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  videoType: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_LIST_COLORS.primaryContainer,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  videoTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  challengeCard: {
    backgroundColor: TOPIC_LIST_COLORS.secondary,
    borderRadius: 12,
    padding: 24,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  challengeIcon: {
    marginBottom: 12,
  },
  challengeCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_LIST_COLORS.onSecondary,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: `${TOPIC_LIST_COLORS.onSecondary}CC`,
    lineHeight: 20,
  },
  challengeButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  challengeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_LIST_COLORS.secondary,
  },
});
