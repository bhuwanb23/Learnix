import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Chapters', value: '14', icon: 'location-outline', color: '#2563eb' },
  { label: 'Members', value: '3,240', icon: 'people-outline', color: '#059669' },
  { label: 'Chapter Events', value: '6', icon: 'calendar-outline', color: '#d97706' },
];

const chapters = [
  {
    id: 'CH1',
    city: 'Bengaluru',
    members: 620,
    president: 'Rohit Malhotra (2021)',
    nextEvent: 'Chapter Meet — Dec 6',
    color: '#2563eb',
  },
  {
    id: 'CH2',
    city: 'Mumbai',
    members: 480,
    president: 'Ananya Joshi (2023)',
    nextEvent: 'Tech Talk — Jan 16',
    color: '#059669',
  },
  {
    id: 'CH3',
    city: 'Hyderabad',
    members: 390,
    president: 'Sneha Iyer (2020)',
    nextEvent: 'Startup Pitch Night — Jan 23',
    color: '#0891b2',
  },
  {
    id: 'CH4',
    city: 'Chennai',
    members: 340,
    president: 'Divya Sharma (2021)',
    nextEvent: 'Career Guidance Session — Feb 7',
    color: '#d97706',
  },
  {
    id: 'CH5',
    city: 'Pune',
    members: 280,
    president: 'Karthik Menon (2018)',
    nextEvent: 'Cloud Careers Workshop — Feb 14',
    color: '#dc2626',
  },
  {
    id: 'CH6',
    city: 'Delhi NCR',
    members: 310,
    president: 'Vikram Singh (2020)',
    nextEvent: 'Annual Chapter Dinner — Feb 21',
    color: '#7c3aed',
  },
];

export default function ChaptersModule({ navigation }) {
  const [query, setQuery] = useState('');

  const filtered = chapters.filter((c) =>
    c.city.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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

      {filtered.map((c) => (
        <View key={c.id} style={styles.chapterCard}>
          <View style={[styles.cityIcon, { backgroundColor: c.color + '1a' }]}>
            <Ionicons name="location" size={18} color={c.color} />
          </View>
          <View style={styles.chapterBody}>
            <Text style={styles.chapterCity}>{c.city} Chapter</Text>
            <Text style={styles.chapterMeta}>
              {c.members} members · President: {c.president}
            </Text>
            <View style={styles.eventChip}>
              <Ionicons name="calendar-outline" size={11} color={c.color} />
              <Text style={[styles.eventText, { color: c.color }]}>{c.nextEvent}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => Alert.alert('Chapter Message', `Opening chat with ${c.city} chapter president...`)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2563eb" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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