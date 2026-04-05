import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function QuickActionsBento({ actions, navigation }) {
  const handlePress = (actionId) => {
    console.log('Quick action pressed:', actionId);
    // Navigate based on action
    if (navigation) {
      switch(actionId) {
        case 'lecture-notes':
          navigation.navigate('LectureNotes');
          break;
        case 'practice-quizzes':
          navigation.navigate('QuizArena');
          break;
        case 'syllabus-tracker':
          navigation.navigate('SubjectTracker');
          break;
        case 'weak-topics':
          navigation.navigate('WeakTopics');
          break;
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.card, { backgroundColor: '#ffffff' }]}
            onPress={() => handlePress(action.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.bgColor }]}>
              <Text style={[styles.icon, { color: action.color }]}>
                {getIconEmoji(action.icon)}
              </Text>
            </View>
            <Text style={styles.label}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const getIconEmoji = (iconName) => {
  const icons = {
    description: '📄',
    quiz: '❓',
    checklist: '✅',
    priority_high: '⚠️',
  };
  return icons[iconName] || '📌';
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
});
