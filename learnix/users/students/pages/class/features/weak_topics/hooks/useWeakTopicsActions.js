import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { QUICK_ACTION_TYPES } from '../constants/weakTopicsData';

export const useWeakTopicsActions = (navigation) => {
  const handleStartStudy = useCallback(() => {
    Alert.alert(
      'Start Study Session',
      'Would you like to start with your weakest topics?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: () => console.log('Starting study session...') },
      ]
    );
  }, []);

  const handleViewProgress = useCallback(() => {
    Alert.alert(
      'View Progress',
      'Opening detailed progress analytics...',
      [{ text: 'OK' }]
    );
  }, []);

  const handleAITutor = useCallback(() => {
    Alert.alert(
      'AI Tutor',
      'Connecting you with AI tutor for personalized help...',
      [{ text: 'OK' }]
    );
  }, []);

  const handleStudyGroup = useCallback(() => {
    Alert.alert(
      'Study Group',
      'Finding study groups for your weak topics...',
      [{ text: 'OK' }]
    );
  }, []);

  const handleResourceClick = useCallback(async (resource) => {
    try {
      const supported = await Linking.canOpenURL(resource.url);
      if (supported) {
        await Linking.openURL(resource.url);
      } else {
        Alert.alert('Error', 'Cannot open this resource');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open resource');
    }
  }, []);

  const handleQuickAction = useCallback((actionType) => {
    switch (actionType) {
      case QUICK_ACTION_TYPES.START_STUDY:
        handleStartStudy();
        break;
      case QUICK_ACTION_TYPES.VIEW_PROGRESS:
        handleViewProgress();
        break;
      case QUICK_ACTION_TYPES.AI_TUTOR:
        handleAITutor();
        break;
      case QUICK_ACTION_TYPES.STUDY_GROUP:
        handleStudyGroup();
        break;
      default:
        console.log('Unknown action:', actionType);
    }
  }, [handleStartStudy, handleViewProgress, handleAITutor, handleStudyGroup]);

  return {
    handleStartStudy,
    handleViewProgress,
    handleAITutor,
    handleStudyGroup,
    handleResourceClick,
    handleQuickAction,
  };
};
