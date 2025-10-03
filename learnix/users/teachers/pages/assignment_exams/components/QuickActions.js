import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function QuickActions({ actions, upload, onPress }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map((a) => (
          <TouchableOpacity key={a.id} style={[styles.card, a.primary ? styles.primary : styles.neutral]} activeOpacity={0.85} onPress={() => onPress && onPress(a.id)}>
            <Text style={[styles.icon, a.primary ? styles.iconPrimary : styles.iconNeutral]}>{a.icon}</Text>
            <Text style={[styles.title, a.primary ? styles.titlePrimary : styles.titleNeutral]} numberOfLines={1}>{a.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.upload} activeOpacity={0.85} onPress={() => onPress && onPress(upload.id)}>
        <Text style={styles.uploadIcon}>{upload.icon}</Text>
        <Text style={styles.uploadText}>{upload.title}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  header: { fontSize: 14, fontWeight: '600', color: '#111827' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '48%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  primary: { backgroundColor: '#1E40AF' },
  neutral: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  icon: { fontSize: 18, marginBottom: 6 },
  iconPrimary: { color: '#FFFFFF' },
  iconNeutral: { color: '#1E40AF' },
  title: { fontSize: 12, fontWeight: '600' },
  titlePrimary: { color: '#FFFFFF' },
  titleNeutral: { color: '#374151' },
  upload: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  uploadIcon: { fontSize: 16, color: '#16A34A' },
  uploadText: { fontSize: 12, fontWeight: '600', color: '#15803D' },
});


