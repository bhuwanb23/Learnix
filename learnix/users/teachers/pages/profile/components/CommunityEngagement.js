import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function CommunityEngagement({ discussions, tiles }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community Engagement</Text>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>Active Discussions</Text>
          <Text style={styles.badge}>5 new</Text>
        </View>
        <View style={styles.discussionList}>
          {discussions.map(d => (
            <View key={d.id} style={styles.discussionRow}>
              <Image source={{ uri: d.avatar }} style={styles.discussionAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.discussionTitle}>{d.title}</Text>
                <Text style={styles.discussionMeta}>{d.meta}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.viewAll}>View All Discussions</Text>
      </View>

      <View style={styles.tileGrid}>
        {tiles.map(t => (
          <View key={t.id} style={styles.tile}>
            <Text style={[styles.tileIcon, { color: t.color }]}>{t.icon}</Text>
            <Text style={styles.tileTitle}>{t.title}</Text>
            <Text style={styles.tileMeta}>{t.subtitle}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  cardHeaderTitle: { fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textPrimary },
  badge: { backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 4, fontSize: TYPOGRAPHY.sizes.xs },
  discussionList: { gap: SPACING.xs },
  discussionRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.xs, backgroundColor: '#F9FAFB', borderRadius: BORDER_RADIUS.lg },
  discussionAvatar: { width: 32, height: 32, borderRadius: BORDER_RADIUS.full, marginRight: SPACING.sm },
  discussionTitle: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.textPrimary },
  discussionMeta: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textSecondary },
  viewAll: { color: '#2563EB', textAlign: 'center', marginTop: SPACING.sm, fontSize: TYPOGRAPHY.sizes.sm },
  tileGrid: { flexDirection: 'row', gap: SPACING.sm },
  tile: { flex: 1, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm },
  tileIcon: { fontSize: 22, marginBottom: 6 },
  tileTitle: { fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm },
  tileMeta: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
});


