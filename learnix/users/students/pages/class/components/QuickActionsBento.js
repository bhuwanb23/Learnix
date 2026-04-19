import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

export default function QuickActionsBento({ actions, navigation }) {
  const handlePress = (actionId) => {
    console.log('Quick action pressed:', actionId);
    
    // Navigate to specific feature pages
    if (actionId === 'lecture-notes' || actionId === 'lecture_notes') {
      if (navigation?.navigate) {
        navigation.navigate('lecture_notes');
      } else {
        console.log('Navigation not available');
      }
    } else if (actionId === 'weak-topics' || actionId === 'weak_topics') {
      if (navigation?.navigate) {
        navigation.navigate('weak_topics');
      } else {
        console.log('Navigation not available');
      }
    } else if (actionId === 'practice-quizzes' || actionId === 'quizzes' || actionId === 'quiz') {
      if (navigation?.navigate) {
        navigation.navigate('quizzes');
      } else {
        console.log('Navigation not available');
      }
    } else if (actionId === 'syllabus-tracker' || actionId === 'syllabus_tracker') {
      if (navigation?.navigate) {
        navigation.navigate('syllabus_tracker');
      } else {
        console.log('Navigation not available');
      }
    }
    // Add more navigation routes as features are designed
  };

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[styles.card, { backgroundColor: '#ffffff' }]}
          onPress={() => handlePress(action.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: action.bgColor }]}>
            <MaterialIcons name={action.icon.replace('_', '-')} size={24} color={action.color} />
          </View>
          <Text style={styles.label}>{action.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  card: {
    width: '47%', // Slightly less than 50% to account for gap
    borderRadius: 12, // rounded-xl
    padding: 24, // p-6
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48, // w-12
    height: 48, // h-12
    borderRadius: 12, // rounded-xl
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12, // mb-3
  },
  label: {
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontWeight: '700',
    color: '#2c2f31',
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Bold',
  },
});
