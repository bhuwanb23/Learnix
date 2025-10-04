import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../';

const AIReminder = ({ reminder, onDismiss, onView }) => {
  if (!reminder) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🤖</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{reminder.title}</Text>
          <Text style={styles.message}>{reminder.message}</Text>
        </View>
        <TouchableOpacity 
          style={styles.dismissButton}
          onPress={() => onDismiss(reminder.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: '#FB923C',
    borderRadius: 8,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A3412',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#C2410C',
    lineHeight: 16,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 146, 60, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissIcon: {
    fontSize: 12,
    color: '#FB923C',
    fontWeight: 'bold',
  },
});

export default AIReminder;
