import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function AssignmentList({ assignments }) {
  return (
    <View style={styles.container}>
      {assignments.map((assignment) => (
        <TouchableOpacity
          key={assignment.id}
          style={styles.card}
          activeOpacity={0.7}
        >
          <View style={styles.header}>
            <View style={styles.infoSection}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: assignment.priorityBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: assignment.priorityColor },
                    ]}
                  >
                    {assignment.priority}
                  </Text>
                </View>
                <Text style={styles.subjectText}>{assignment.subject}</Text>
              </View>

              <Text style={styles.title}>{assignment.title}</Text>

              <View style={styles.metaRow}>
                {assignment.timeLeft && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>⏰</Text>
                    <Text style={styles.metaText}>{assignment.timeLeft}</Text>
                  </View>
                )}
                {assignment.dueDate && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📅</Text>
                    <Text style={styles.metaText}>{assignment.dueDate}</Text>
                  </View>
                )}
                {assignment.files && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📎</Text>
                    <Text style={styles.metaText}>{assignment.files} Files</Text>
                  </View>
                )}
                {assignment.teamTask && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>👥</Text>
                    <Text style={styles.metaText}>Team Task</Text>
                  </View>
                )}
              </View>
            </View>

            <View
              style={[
                styles.progressCircle,
                { borderColor: `${assignment.progressColor}33` },
              ]}
            >
              <Text
                style={[styles.progressText, { color: assignment.progressColor }]}
              >
                {assignment.progress}%
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Text style={styles.swipeHint}>
              ← Swipe to dismiss
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(0, 80, 212, 0.1)' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionIcon, { color: '#0050d4' }]}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(112, 42, 225, 0.1)' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionIcon, { color: '#702ae1' }]}>📅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoSection: {
    flex: 1,
    marginRight: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Manrope-ExtraBold',
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#595c5e',
    fontFamily: 'Manrope-Bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#595c5e',
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.4,
  },
  swipeHint: {
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Manrope-Bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
});
