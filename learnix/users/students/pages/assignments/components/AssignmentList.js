import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function AssignmentList({ assignments }) {
  const hexToRgba = (hex, opacity) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` 
      : null;
  };

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
                    <MaterialIcons name="schedule" size={16} color="#595c5e" />
                    <Text style={styles.metaText}>{assignment.timeLeft}</Text>
                  </View>
                )}
                {assignment.dueDate && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="event" size={16} color="#595c5e" />
                    <Text style={styles.metaText}>{assignment.dueDate}</Text>
                  </View>
                )}
                {assignment.files && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="attach-file" size={16} color="#595c5e" />
                    <Text style={styles.metaText}>{assignment.files} Files</Text>
                  </View>
                )}
                {assignment.teamTask && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="group" size={16} color="#595c5e" />
                    <Text style={styles.metaText}>Team Task</Text>
                  </View>
                )}
              </View>
            </View>

            <View
              style={[
                styles.progressCircle,
                { borderColor: hexToRgba(assignment.progressColor, 0.2) },
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
            <View style={styles.swipeHintContainer}>
              <MaterialIcons name="chevron-left" size={14} color="#595c5e" />
              <Text style={styles.swipeHint}>Swipe to dismiss</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(0, 80, 212, 0.1)' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="done-all" size={14} color="#0050d4" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(112, 42, 225, 0.1)' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="event-available" size={14} color="#702ae1" />
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
    gap: 24, // space-y-6
  },
  card: {
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    borderRadius: 12, // rounded-xl
    padding: 24, // p-6
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    gap: 12, // gap-3
    marginBottom: 8, // mb-2
  },
  priorityBadge: {
    paddingHorizontal: 8, // px-2
    paddingVertical: 2, // py-0.5
    borderRadius: 4, // rounded
  },
  priorityText: {
    fontSize: 10, // text-[10px]
    fontWeight: '900', // font-black
    textTransform: 'uppercase',
    letterSpacing: 1.5, // tracking-widest
    fontFamily: 'Manrope-ExtraBold',
  },
  subjectText: {
    fontSize: 12, // text-xs
    fontWeight: '700', // font-bold
    color: '#595c5e', // text-on-surface-variant
    fontFamily: 'Manrope-Bold',
  },
  title: {
    fontSize: 20, // text-xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 12, // mb-3
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16, // gap-4
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // gap-1
  },
  metaText: {
    fontSize: 14, // text-sm
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
  },
  progressCircle: {
    width: 48, // w-12
    height: 48, // h-12
    borderRadius: 24, // rounded-full
    borderWidth: 4, // border-4
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12, // text-xs
    fontWeight: '700', // font-bold
    fontFamily: 'Manrope-Bold',
  },
  actions: {
    marginTop: 24, // mt-6
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.4,
  },
  swipeHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // gap-1
  },
  swipeHint: {
    fontSize: 10, // text-[10px]
    fontWeight: '700', // font-bold
    color: '#595c5e', // assuming inherits or text-on-surface-variant
    textTransform: 'uppercase',
    letterSpacing: 1.5, // tracking-widest
    fontFamily: 'Manrope-Bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8, // gap-2
  },
  actionButton: {
    width: 32, // w-8
    height: 32, // h-8
    borderRadius: 16, // rounded-full
    justifyContent: 'center',
    alignItems: 'center',
  },
});
