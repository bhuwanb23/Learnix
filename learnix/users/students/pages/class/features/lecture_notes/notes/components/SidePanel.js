import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NOTES_COLORS } from '../constants/notesData';

export default function SidePanel({ data }) {
  return (
    <View style={styles.container}>
      {/* Progress Card */}
      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Topic Mastery</Text>
        <View style={styles.progressContent}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>{data.progress}%</Text>
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>{data.progressLabel}</Text>
            <Text style={styles.progressNote}>{data.progressNote}</Text>
          </View>
        </View>
      </View>

      {/* Study Tools */}
      <View style={styles.toolsCard}>
        <Text style={styles.cardTitle}>Study Tools</Text>
        <View style={styles.toolsList}>
          {data.studyTools.map((tool, index) => (
            <TouchableOpacity key={index} style={styles.toolItem} activeOpacity={0.7}>
              <View style={styles.toolLeft}>
                <Ionicons name={tool.icon} size={20} color={tool.color} />
                <Text style={styles.toolLabel}>{tool.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={NOTES_COLORS.outlineVariant} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quote Card */}
      <View style={styles.quoteCard}>
        <Ionicons name="chatbubble-ellipses" size={32} color="rgba(255,255,255,0.5)" style={styles.quoteIcon} />
        <Text style={styles.quoteText}>{data.quote.text}</Text>
        <Text style={styles.quoteAuthor}>{data.quote.author}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  progressCard: {
    backgroundColor: NOTES_COLORS.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${NOTES_COLORS.outlineVariant}1A`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: NOTES_COLORS.onSurface,
    marginBottom: 12,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: NOTES_COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: `${NOTES_COLORS.primary}33`,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: NOTES_COLORS.primary,
  },
  progressInfo: {
    flex: 1,
    gap: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: NOTES_COLORS.onSurface,
  },
  progressNote: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: NOTES_COLORS.onSurfaceVariant,
  },
  toolsCard: {
    backgroundColor: NOTES_COLORS.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
  },
  toolsList: {
    gap: 8,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NOTES_COLORS.surfaceContainerLowest,
    padding: 12,
    borderRadius: 8,
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: NOTES_COLORS.onSurface,
  },
  quoteCard: {
    backgroundColor: NOTES_COLORS.primary,
    padding: 20,
    borderRadius: 12,
    shadowColor: NOTES_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quoteIcon: {
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 12,
  },
  quoteAuthor: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
