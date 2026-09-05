import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_SETUP_COLORS, QUIZ_CONFIG_DATA, QUIZ_MODES, QUESTION_COUNTS, DIFFICULTY_LEVELS, PERFORMANCE_TWEAKS } from './constants/quizSetupData';
import ModeSelection from './components/ModeSelection';
import QuestionCount from './components/QuestionCount';
import DifficultyLevel from './components/DifficultyLevel';
import PerformanceTweaks from './components/PerformanceTweaks';

export default function ProfessionalFormPage({ navigation, route }) {
  const [selectedMode, setSelectedMode] = useState('practice');
  const [selectedCount, setSelectedCount] = useState(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [tweaks, setTweaks] = useState(PERFORMANCE_TWEAKS);

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleToggle = (id) => {
    setTweaks(tweaks.map(tweak => 
      tweak.id === id ? { ...tweak, enabled: !tweak.enabled } : tweak
    ));
  };

  const handleStartQuiz = () => {
    if (navigation?.navigateToAttempt) {
      navigation.navigateToAttempt({
        mode: selectedMode,
        questionCount: selectedCount,
        difficulty: selectedDifficulty,
        tweaks,
      });
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
            <Ionicons name="arrow-back" size={22} color={QUIZ_SETUP_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Setup</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroLabel}>Subject: {QUIZ_CONFIG_DATA.subject}</Text>
          <Text style={styles.heroTitle}>
            Tailor Your <Text style={styles.highlight}>Learning</Text> Experience.
          </Text>
          <Text style={styles.heroDescription}>{QUIZ_CONFIG_DATA.description}</Text>
        </View>

        {/* Mode Selection */}
        <View style={styles.section}>
          <ModeSelection
            modes={QUIZ_MODES}
            selectedMode={selectedMode}
            onSelect={setSelectedMode}
          />
        </View>

        {/* Configuration Grid */}
        <View style={styles.configSection}>
          <QuestionCount
            counts={QUESTION_COUNTS}
            selectedCount={selectedCount}
            onSelect={setSelectedCount}
          />
          
          <View style={styles.configSpacing} />
          
          <DifficultyLevel
            levels={DIFFICULTY_LEVELS}
            selectedDifficulty={selectedDifficulty}
            onSelect={setSelectedDifficulty}
          />
          
          <View style={styles.configSpacing} />
          
          <PerformanceTweaks
            tweaks={tweaks}
            onToggle={handleToggle}
          />
        </View>

        {/* Start Button */}
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStartQuiz}
          activeOpacity={0.7}
        >
          <Text style={styles.startButtonText}>Start Quiz</Text>
          <Ionicons name="play" size={24} color="#ffffff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: QUIZ_SETUP_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    backgroundColor: QUIZ_SETUP_COLORS.surface,
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
    color: QUIZ_SETUP_COLORS.onSurface,
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
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_SETUP_COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_SETUP_COLORS.onSurface,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  highlight: {
    color: QUIZ_SETUP_COLORS.primary,
  },
  heroDescription: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: QUIZ_SETUP_COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  configSection: {
    marginBottom: 20,
  },
  configSpacing: {
    height: 14,
  },
  startButton: {
    backgroundColor: QUIZ_SETUP_COLORS.primary,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: QUIZ_SETUP_COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
  },
});