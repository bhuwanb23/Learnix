import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HabitTracker({ habits, onToggleHabit, completedCount, totalCount }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Habits</Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{completedCount}/{totalCount} Complete</Text>
        </View>
      </View>
      
      <View style={styles.habitsList}>
        {habits.map((habit) => (
          <TouchableOpacity
            key={habit.id}
            style={[
              styles.habitItem,
              habit.completed && styles.completedHabit,
            ]}
            onPress={() => onToggleHabit(habit.id)}
            activeOpacity={0.7}
          >
            <View style={styles.habitContent}>
              <View style={styles.habitLeft}>
                <View style={[
                  styles.checkIcon,
                  habit.completed && styles.completedCheck,
                ]}>
                  <Ionicons
                    name={habit.completed ? "checkmark" : "ellipse-outline"}
                    size={16}
                    color={habit.completed ? "#FFFFFF" : "#9ca3af"}
                  />
                </View>
                <Text style={[
                  styles.habitTitle,
                  habit.completed && styles.completedText,
                ]}>
                  {habit.title}
                </Text>
              </View>
              <Text style={[
                styles.habitPoints,
                habit.completed && styles.completedPoints,
              ]}>
                +{habit.points} pts
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.3,
  },
  progressBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-SemiBold',
    letterSpacing: 0.2,
  },
  habitsList: {
    gap: 8,
  },
  habitItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  completedHabit: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  habitContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  completedCheck: {
    backgroundColor: '#10b981',
    borderRadius: 9,
  },
  habitTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'PlusJakartaSans-SemiBold',
    letterSpacing: 0.2,
    flex: 1,
  },
  completedText: {
    color: '#059669',
  },
  habitPoints: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'PlusJakartaSans-SemiBold',
    letterSpacing: 0.1,
  },
  completedPoints: {
    color: '#10b981',
  },
});
