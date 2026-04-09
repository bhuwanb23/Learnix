import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SubjectCard from './SubjectCard';
import { COLORS } from '../../constants/lectureNotesData';

export default function SubjectDirectory({ subjects, onViewAll, onSubjectPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subject Directory</Text>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={onViewAll}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onPress={() => onSubjectPress(subject)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: COLORS.onSurface,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: COLORS.primary,
  },
  list: {
    paddingHorizontal: 24,
    gap: 16,
  },
});
