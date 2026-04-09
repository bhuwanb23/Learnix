import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS, FILTER_CHIPS, CONTINUE_STUDYING, SUBJECTS } from './constants/lectureNotesData';
import LectureNotesHeader from './components/LectureNotesHeader';
import FilterChips from './components/FilterChips';
import ContinueStudyingCard from './components/ContinueStudyingCard';
import SubjectDirectory from './components/SubjectDirectory';

export default function SubjectListPage({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSearch = () => {
    Alert.alert('Search', 'Search functionality coming soon');
  };

  const handleResume = () => {
    Alert.alert(
      'Resume Study',
      `Continue studying ${CONTINUE_STUDYING.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => console.log('Resume studying') },
      ]
    );
  };

  const handleViewAll = () => {
    Alert.alert('View All', 'Navigate to full subject list');
  };

  const handleSubjectPress = (subject) => {
    Alert.alert(
      'Open Subject',
      `Open ${subject.title} lecture notes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => console.log('Open subject:', subject.id) },
      ]
    );
  };

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    console.log('Filter changed to:', filterId);
  };

  return (
    <View style={styles.container}>
      <LectureNotesHeader 
        onBack={handleBack} 
        onSearch={handleSearch} 
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <FilterChips
          filters={FILTER_CHIPS}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />

        <View style={styles.section}>
          <ContinueStudyingCard 
            course={CONTINUE_STUDYING} 
            onResume={handleResume} 
          />
        </View>

        <View style={styles.section}>
          <SubjectDirectory
            subjects={SUBJECTS}
            onViewAll={handleViewAll}
            onSubjectPress={handleSubjectPress}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 24,
  },
  bottomPadding: {
    height: 24,
  },
});
