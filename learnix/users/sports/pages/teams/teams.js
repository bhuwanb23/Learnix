import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import TeamDetail from './pages/team_detail/team_detail';

const teams = [
  { id: 'T1', name: 'Cricket', members: 18, captain: 'Karan Singh', coach: 'Mr. Patil', nextMatch: 'Nov 20 vs RV College', color: '#2563eb', icon: 'baseball-outline' },
  { id: 'T2', name: 'Football', members: 18, captain: 'Vikram Nair', coach: "Mr. D'Souza", nextMatch: 'Today 6:30 PM vs NIT', color: '#059669', icon: 'football-outline' },
  { id: 'T3', name: 'Basketball', members: 12, captain: 'Arjun Mehta', coach: 'Ms. Rao', nextMatch: 'Nov 22 vs BMS', color: '#d97706', icon: 'basketball-outline' },
  { id: 'T4', name: 'Badminton', members: 10, captain: 'Divya Menon', coach: 'Mr. Fernandes', nextMatch: 'Tryouts Nov 18', color: '#0891b2', icon: 'tennisball-outline' },
  { id: 'T5', name: 'Athletics', members: 24, captain: 'Rohan Kulkarni', coach: 'Mr. Patil', nextMatch: 'Annual Sports Meet', color: '#dc2626', icon: 'fitness-outline' },
  { id: 'T6', name: 'Dance Crew', members: 14, captain: 'Sneha Patel', coach: 'Ms. Iyer', nextMatch: 'Cultural Night Dec 5', color: '#0891b2', icon: 'musical-notes-outline' },
];

export default function TeamsModule({ navigation }) {
  const [selectedTeam, setSelectedTeam] = useState(null);

  if (selectedTeam) {
    return <TeamDetail team={selectedTeam} onBack={() => setSelectedTeam(null)} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Active Teams</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>148</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>9</Text>
          <Text style={styles.statLabel}>Coaches</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Teams</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('New Team', 'Team setup opens here — sport, coach and tryouts.')}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>New Team</Text>
        </TouchableOpacity>
      </View>

      {teams.map((t) => (
        <TouchableOpacity
          key={t.id}
          style={styles.card}
          onPress={() => setSelectedTeam(t)}
        >
          <View style={[styles.teamIcon, { backgroundColor: t.color + '1a' }]}>
            <Ionicons name={t.icon} size={19} color={t.color} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.name}>{t.name}</Text>
            <Text style={styles.meta}>
              {t.members} players · Captain {t.captain}
            </Text>
            <Text style={styles.nextMatch}>{t.nextMatch}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  nextMatch: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.primary,
    marginTop: 4,
  },
});