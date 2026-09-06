import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';

const COLORS = ['#2563eb', '#059669', '#0891b2', '#d97706', '#dc2626', '#7c3aed'];

export default function ChaptersModule({ navigation }) {
  const [chapters, setChapters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const list = await alumniApi.chapters();
      setChapters(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  if (loading && !chapters) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (error && !chapters) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filtered = (chapters ?? []).filter((c) =>
    c.city.toLowerCase().includes(query.toLowerCase()),
  );
  const totalMembers = (chapters ?? []).reduce((s, c) => s + c.memberCount, 0);
  const stats = [
    { label: 'Chapters', value: String((chapters ?? []).length), icon: 'location-outline', color: '#2563eb' },
    { label: 'Members', value: String(totalMembers), icon: 'people-outline', color: '#059669' },
    { label: 'Upcoming', value: String((chapters ?? []).filter((c) => c.nextEventAt).length), icon: 'calendar-outline', color: '#d97706' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chapter city..."
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {filtered.map((c, idx) => {
        const color = COLORS[idx % COLORS.length];
        return (
          <View key={c.id} style={styles.chapterCard}>
            <View style={[styles.cityIcon, { backgroundColor: color + '1a' }]}>
              <Ionicons name="location" size={18} color={color} />
            </View>
            <View style={styles.chapterBody}>
              <Text style={styles.chapterCity}>{c.city} Chapter</Text>
              <Text style={styles.chapterMeta}>
                {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                {c.president ? ` · President: ${c.president}` : ''}
              </Text>
              {c.nextEventAt ? (
                <View style={styles.eventChip}>
                  <Ionicons name="calendar-outline" size={11} color={color} />
                  <Text style={[styles.eventText, { color }]}>
                    Next event — {new Date(c.nextEventAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.msgBtn}
              onPress={() => Alert.alert('Chapter Contact', c.president ? `President of ${c.city} chapter: ${c.president}` : 'No president assigned yet.')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>
        );
      })}
      {filtered.length === 0 && (
        <Text style={styles.emptyText}>No chapters match your search.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
  },
  cityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chapterBody: { flex: 1, marginRight: 8 },
  chapterCity: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  chapterMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  eventText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    marginLeft: 4,
  },
  msgBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
