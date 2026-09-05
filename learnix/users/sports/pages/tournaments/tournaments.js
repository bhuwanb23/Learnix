import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialFixtures = [
  { id: '1', tournament: 'Inter-College Cricket Cup', match: 'Learnix vs RV College', date: 'Nov 20', time: '9:00 AM', venue: 'Main Ground', status: 'Upcoming' },
  { id: '2', tournament: 'Inter-College Cricket Cup', match: 'BMS vs PES', date: 'Nov 20', time: '1:00 PM', venue: 'Main Ground', status: 'Upcoming' },
  { id: '3', tournament: 'Football League', match: 'Learnix vs NIT', date: 'Today', time: '6:30 PM', venue: 'Football Field', status: 'Today' },
  { id: '4', tournament: 'Inter-College Cricket Cup', match: 'Learnix vs BMS', date: 'Nov 12', time: '9:00 AM', venue: 'Main Ground', result: 'Learnix won by 4 wickets' },
  { id: '5', tournament: 'Football League', match: 'Learnix vs PES', date: 'Nov 8', time: '5:00 PM', venue: 'PES Ground', result: 'PES won 2-1' },
];

const standings = [
  { pos: 1, team: 'Learnix', played: 4, won: 3, points: 9 },
  { pos: 2, team: 'RV College', played: 4, won: 3, points: 9 },
  { pos: 3, team: 'BMS', played: 4, won: 2, points: 6 },
  { pos: 4, team: 'PES', played: 4, won: 1, points: 3 },
  { pos: 5, team: 'NIT', played: 4, won: 0, points: 0 },
];

export default function TournamentsModule({ navigation }) {
  const [tab, setTab] = useState('Fixtures');

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {['Fixtures', 'Standings'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'Fixtures' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {initialFixtures.map((f) => (
            <View key={f.id} style={styles.card}>
              <View style={styles.tournamentRow}>
                <View style={styles.trophyIcon}>
                  <Ionicons name="trophy-outline" size={14} color="#d97706" />
                </View>
                <Text style={styles.tournamentName}>{f.tournament}</Text>
              </View>
              <Text style={styles.match}>{f.match}</Text>
              <Text style={styles.meta}>
                {f.date} · {f.time} · {f.venue}
              </Text>
              {f.status ? (
                <View
                  style={[
                    styles.statusChip,
                    { backgroundColor: f.status === 'Today' ? '#fee2e2' : '#dbeafe' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: f.status === 'Today' ? '#dc2626' : '#2563eb' },
                    ]}
                  >
                    {f.status}
                  </Text>
                </View>
              ) : (
                <View style={styles.resultBox}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                  <Text style={styles.resultText}>{f.result}</Text>
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => Alert.alert('New Fixture', 'Fixture scheduler opens here — teams, date and venue.')}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newText}>Schedule Fixture</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          <View style={styles.standingsCard}>
            <View style={styles.standingsHeader}>
              <Text style={[styles.headerCell, styles.posCol]}>#</Text>
              <Text style={[styles.headerCell, styles.teamCol]}>Team</Text>
              <Text style={styles.headerCell}>P</Text>
              <Text style={styles.headerCell}>W</Text>
              <Text style={styles.headerCell}>Pts</Text>
            </View>
            {standings.map((s) => (
              <View
                key={s.pos}
                style={[styles.standingsRow, s.team === 'Learnix' && styles.ownRow]}
              >
                <Text style={[styles.posText, styles.posCol]}>{s.pos}</Text>
                <Text style={[styles.teamText, styles.teamCol]}>
                  {s.team}
                  {s.team === 'Learnix' ? ' (You)' : ''}
                </Text>
                <Text style={styles.numText}>{s.played}</Text>
                <Text style={styles.numText}>{s.won}</Text>
                <Text style={[styles.numText, styles.ptsText]}>{s.points}</Text>
              </View>
            ))}
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Top 2 teams qualify for the semi-finals. Learnix needs a win on Nov 20 to secure the
              top spot.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  list: { paddingTop: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  tournamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  trophyIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  tournamentName: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  match: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 8,
  },
  resultText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#059669',
    marginLeft: 4,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 8,
  },
  newText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 6,
  },
  standingsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  standingsHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerCell: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  ownRow: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  posCol: { width: 30 },
  teamCol: { flex: 1, textAlign: 'left' },
  posText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  teamText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  numText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  ptsText: {
    fontFamily: 'Manrope_800ExtraBold',
    color: theme.colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.text,
    marginLeft: 8,
    lineHeight: 18,
  },
});