import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../../constants/theme';

const SubjectCard = ({ subject, onChapterToggle, getProgressColor, getStatusColor, isExpanded, onToggleExpanded }) => {
  const progressColor = getProgressColor(subject.progress);
  const statusColor = getStatusColor(subject.status);

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onToggleExpanded(subject.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.subjectInfo}>
          <View style={[styles.iconContainer, { backgroundColor: subject.backgroundColor }]}>
            <Text style={styles.icon}>{subject.icon}</Text>
          </View>
          <View style={styles.textInfo}>
            <Text style={styles.subjectName}>{subject.name}</Text>
            <Text style={styles.grade}>{subject.grade}</Text>
          </View>
        </View>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: progressColor }]}>
            {subject.progress}%
          </Text>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {subject.status}
          </Text>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={styles.progressTrack}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${subject.progress}%`,
                backgroundColor: progressColor 
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.chapterInfo}>
          {subject.chaptersCompleted}/{subject.totalChapters} chapters
        </Text>
        <Text style={styles.dueDate}>Due: {subject.dueDate}</Text>
      </View>

      {/* Chapter List (expanded view) */}
      {isExpanded && (
        <View style={styles.chapterList}>
          {subject.chapters.map((chapter) => (
            <TouchableOpacity
              key={chapter.id}
              style={[
                styles.chapterItem,
                chapter.completed && styles.completedChapter,
                chapter.current && styles.currentChapter
              ]}
              onPress={() => onChapterToggle(subject.id, chapter.id)}
              activeOpacity={0.7}
            >
              <View style={styles.chapterContent}>
                <View style={styles.chapterCheckbox}>
                  <Text style={[
                    styles.checkboxIcon,
                    { color: chapter.completed ? '#10B981' : '#6B7280' }
                  ]}>
                    {chapter.completed ? '✓' : '○'}
                  </Text>
                </View>
                <View style={styles.chapterTextContainer}>
                  <Text 
                    style={[
                      styles.chapterName,
                      chapter.completed && styles.completedText
                    ]}
                  >
                    {chapter.name}
                  </Text>
                  <Text style={styles.chapterStatus}>
                    {chapter.completed ? 'Completed' : chapter.current ? 'Current' : 'Pending'}
                  </Text>
                </View>
              </View>
              {chapter.current && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  grade: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressInfo: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  expandIcon: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  progressBar: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  dueDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  chapterList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  completedChapter: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  currentChapter: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chapterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapterCheckbox: {
    marginRight: 12,
  },
  checkboxIcon: {
    fontSize: 16,
  },
  chapterTextContainer: {
    flex: 1,
  },
  chapterStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chapterName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#059669',
  },
  currentBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SubjectCard;
