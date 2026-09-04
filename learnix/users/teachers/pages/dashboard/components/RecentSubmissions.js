import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function RecentSubmissions({ submissions, onGrade }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Submissions</Text>

      <View style={styles.list}>
        {submissions.map((submission) => (
          <TouchableOpacity
            key={submission.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => onGrade && onGrade(submission)}
          >
            <Image 
              source={{ uri: submission.avatar }} 
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.info}>
              <Text style={styles.name}>{submission.name}</Text>
              <Text style={styles.assignment}>{submission.assignment}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.time}>{submission.time}</Text>
              <TouchableOpacity
                style={styles.gradeButton}
                activeOpacity={0.8}
                onPress={() => onGrade && onGrade(submission)}
              >
                <Text style={styles.gradeText}>Grade</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.1)',
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
  },
  assignment: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#94a3b8',
  },
  gradeButton: {
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  gradeText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#0050d4',
  },
});
