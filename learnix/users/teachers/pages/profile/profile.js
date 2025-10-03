import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING } from '../../../../constants/theme';
import useTeacherProfile from './hooks/useTeacherProfile';
import ProfileCard from './components/ProfileCard';
import RecognitionBadges from './components/RecognitionBadges';
import QuickAccess from './components/QuickAccess';
import CommunityEngagement from './components/CommunityEngagement';

export default function TeacherProfile() {
  const { profile, badges, quickAccess, discussions, tiles } = useTeacherProfile();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ProfileCard profile={profile} />
      <RecognitionBadges items={badges} />
      <QuickAccess items={quickAccess} />
      <CommunityEngagement discussions={discussions} tiles={tiles} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
});


