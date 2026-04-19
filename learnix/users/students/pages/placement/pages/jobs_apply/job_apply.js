import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Import components
import {
  ApplicationHeader,
  JobHero,
  BasicDetails,
  ResumeUpload,
  CoverLetter,
  Confirmation,
  SubmitButton,
  CompanyQuote,
} from './components';
import { usePlacementLayout } from '../../placementLayout';

export default function JobApply({ navigation, route }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const insets = useSafeAreaInsets();
  const { horizontalPadding, isCompact } = usePlacementLayout();

  const handleGoBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSubmitApplication = () => {
    console.log('Submit pressed, isConfirmed:', isConfirmed);
    if (!isConfirmed) {
      alert('Please confirm the information before submitting');
      return;
    }
    // Navigate to success page
    console.log('Navigating to JobApplyDone...');
    if (navigation?.navigate) {
      navigation.navigate('JobApplyDone', {});
    } else {
      console.error('Navigation not available:', navigation);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      >
        {/* Top Bar */}
        <ApplicationHeader onGoBack={handleGoBack} />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
        >
          {/* Hero Section */}
          <JobHero compact={isCompact} />

          {/* Section 1: Basic Details */}
          <BasicDetails />

          {/* Section 2: Resume Upload */}
          <ResumeUpload />

          {/* Section 3: Cover Letter */}
          <CoverLetter 
            value={coverLetter}
            onChangeText={setCoverLetter}
          />

          {/* Section 4: Confirmation */}
          <Confirmation 
            isConfirmed={isConfirmed}
            onToggle={() => setIsConfirmed(!isConfirmed)}
          />

          {/* Action Button */}
          <SubmitButton 
            isDisabled={!isConfirmed}
            onPress={handleSubmitApplication}
          />

          {/* Company Quote */}
          <CompanyQuote />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
});
