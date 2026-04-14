import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function JobApply({ navigation, route }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleGoBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSubmitApplication = () => {
    if (!isConfirmed) {
      alert('Please confirm the information before submitting');
      return;
    }
    // Navigate to success page
    if (navigation?.navigate) {
      navigation.navigate('JobApplyDone', {});
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top Bar */}
        <ApplicationHeader onGoBack={handleGoBack} />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <JobHero />

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

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
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
});
