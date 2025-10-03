import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function ProfileCard({ profile }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          <View style={styles.status} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.title}>{profile.title}</Text>
          <Text style={styles.university}>{profile.university}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>⭐ 4.9</Text>
          </View>
        </View>
      </View>
      <View style={styles.statsRow}>
        {profile.stats.map(s => (
          <View key={s.id} style={styles.stat}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.button}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: BORDER_RADIUS.full, borderWidth: 3, borderColor: '#DBEAFE' },
  status: { position: 'absolute', right: 2, bottom: 2, width: 14, height: 14, backgroundColor: '#22C55E', borderRadius: 7, borderWidth: 2, borderColor: COLORS.white },
  info: { flex: 1 },
  name: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.textPrimary },
  title: { color: '#2563EB', fontWeight: TYPOGRAPHY.weights.medium, marginTop: 2 },
  university: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  ratingText: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold },
  statLabel: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textSecondary },
  button: { backgroundColor: '#2563EB', borderRadius: BORDER_RADIUS.lg, paddingVertical: SPACING.sm, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontWeight: TYPOGRAPHY.weights.medium },
});


