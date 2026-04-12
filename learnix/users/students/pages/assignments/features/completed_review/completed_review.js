import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { COMPLETED_REVIEW_DATA } from './constants/completedReviewData';
import HeaderSection from './components/HeaderSection';
import HeroSection from './components/HeroSection';
import SubmissionSummaryCard from './components/SubmissionSummaryCard';
import FileAttachmentCard from './components/FileAttachmentCard';
import InstructorInfoCard from './components/InstructorInfoCard';
import AchievementBadgeCard from './components/AchievementBadgeCard';

export default function CompletedReviewScreen({ route, navigation }) {
  const clickedAssignment = route?.params?.assignment || {};
  const assignmentData = {
    ...COMPLETED_REVIEW_DATA,
    ...clickedAssignment,
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <HeaderSection onBack={handleBack} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <HeroSection assignment={assignmentData} />
        <SubmissionSummaryCard assignment={assignmentData} />
        <View style={styles.sideBySide}>
          <View style={styles.leftColumn}>
            <FileAttachmentCard assignment={assignmentData} />
            <InstructorInfoCard assignment={assignmentData} />
          </View>
        </View>
        <AchievementBadgeCard assignment={assignmentData} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COMPLETED_REVIEW_DATA.surface,
  },
  scrollView: {
    flex: 1,
  },
  sideBySide: {
    paddingHorizontal: 0,
  },
  leftColumn: {
    flex: 1,
  },
});
