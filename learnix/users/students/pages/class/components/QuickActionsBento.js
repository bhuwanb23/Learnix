import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function QuickActionsBento({ actions, navigation }) {
  const handlePress = (actionId) => {
    if (!navigation?.navigate) return;

    // Navigate to specific feature pages
    if (actionId === 'lecture-notes' || actionId === 'lecture_notes') {
      navigation.navigate('lecture_notes');
    } else if (actionId === 'weak-topics' || actionId === 'weak_topics') {
      navigation.navigate('weak_topics');
    } else if (actionId === 'practice-quizzes' || actionId === 'quizzes' || actionId === 'quiz') {
      navigation.navigate('quizzes');
    } else if (actionId === 'syllabus-tracker' || actionId === 'syllabus_tracker') {
      navigation.navigate('syllabus_tracker');
    }
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
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    textAlign: 'center',
    fontFamily: 'Manrope-Bold',
  },
});
