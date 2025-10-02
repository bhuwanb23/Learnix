import { QUIZ_ACTION_TYPES } from '../constants/quizData';

export default function useQuizActions(navigation) {
  const handleQuickAction = (actionType) => {
    console.log('Quick action pressed:', actionType);
    
    switch (actionType) {
      case QUIZ_ACTION_TYPES.QUICK_TEST:
        // Navigate to quick test screen
        console.log('Starting quick test...');
        break;
      case QUIZ_ACTION_TYPES.AI_PRACTICE:
        // Navigate to AI practice screen
        console.log('Starting AI practice...');
        break;
      default:
        console.log('Unknown action type:', actionType);
    }
  };

  const handleSubjectAction = (subjectId, actionType) => {
    console.log('Subject action:', subjectId, actionType);
    
    switch (actionType) {
      case QUIZ_ACTION_TYPES.SUBJECT_PRACTICE:
        console.log(`Starting practice for ${subjectId}...`);
        break;
      case QUIZ_ACTION_TYPES.TIMED_TEST:
        console.log(`Starting timed test for ${subjectId}...`);
        break;
      default:
        console.log('Unknown subject action:', actionType);
    }
  };

  const handleWeakTopicPractice = (topicId) => {
    console.log('Starting weak topic practice:', topicId);
    // Navigate to topic-specific practice
  };

  const handleViewAllSubjects = () => {
    console.log('View all subjects pressed');
    // Navigate to subjects list screen
  };

  const handleViewAllLeaderboard = () => {
    console.log('View all leaderboard pressed');
    // Navigate to full leaderboard screen
  };

  const handleViewAllAchievements = () => {
    console.log('View all achievements pressed');
    // Navigate to achievements screen
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed');
    // Navigate to notifications screen
  };

  return {
    handleQuickAction,
    handleSubjectAction,
    handleWeakTopicPractice,
    handleViewAllSubjects,
    handleViewAllLeaderboard,
    handleViewAllAchievements,
    handleNotificationPress
  };
}
