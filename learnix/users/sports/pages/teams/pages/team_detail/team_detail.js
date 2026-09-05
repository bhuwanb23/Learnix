import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const players = [
  { id: '1', name: 'Karan Singh', role: 'Captain', position: 'Batsman', year: '4th' },
  { id: '2', name: 'Arjun Mehta', role: 'Player', position: 'Bowler', year: '3rd' },
  { id: '3', name: 'Rohan Kulkarni', role: 'Player', position: 'All-rounder', year: '3rd' },
  { id: '4', name: 'Kabir Anand', role: 'Player', position: 'Wicket-keeper', year: '3rd' },
  { id: '5', name: 'Nikhil Rao', role: 'Player', position: 'Batsman', year: '2nd' },
];

const fixtures = [
  { date: 'Nov 20', vs: 'vs RV College', venue: 'Main Ground', result: 'Upcoming' },
  { date: 'Nov 12', vs: 'vs BMS', venue: 'Main Ground', result: 'Won by 4 wickets' },
  { date: 'Nov 05', vs: 'vs PES', venue: 'PES Ground', result: 'Lost by 22 runs' },
];

export default function TeamDetail({ team, onBack }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroIconWrap}>
            <Ionicons name={team.icon} size={28} color="#fff" />
          </View>
          <Text style={styles.teamName}>{team.name} Team</Text>
          <Text style={styles.teamMeta}>
            {team.members} players · Coach {team.coach}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{team.members}</Text>
              <Text style={styles.heroStatLabel}>Players</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>8</Text>
              <Text style={styles.heroStatLabel}>Wins</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>3</Text>
              <Text style={styles.heroStatLabel}>Losses</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Alert.alert('Tryouts', `Open ${team.name} tryouts for student registrations.`)
            }
          >
            <Ionicons name="person-add-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Tryouts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowAdd(!showAdd)}
          >
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{showAdd ? 'Cancel' : 'Add Player'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Alert.alert('Match Alert', `Push match reminders for "${team.nextMatch}" to all team members.`)
            }
          >
            <Ionicons name="megaphone-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Alert</Text>
          </TouchableOpacity>
        </View>

        {showAdd && (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Add player to {team.name} team</Text>
            <Text style={styles.addText}>
              Student search opens here — pick a student and their position, then confirm.
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                Alert.alert('Player Added', 'Player added to the team roster.');
                setShowAdd(false);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
              <Text style={styles.confirmText}>Add to Roster</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Roster</Text>
          <Text style={styles.sectionCount}>{players.length} players</Text>
        </View>
        {players.map((p) => (
          <View key={p.id} style={styles.playerCard}>
            <View style={[styles.avatar, { backgroundColor: team.color + '1a' }]}>
              <Text style={[styles.avatarText, { color: team.color }]}>{p.name.charAt(0)}</Text>
            </View>
            <View style={styles.playerBody}>
              <Text style={styles.playerName}>{p.name}</Text>
              <Text style={styles.playerMeta}>
                {p.position} · {p.year} yr
              </Text>
            </View>
            <View style={[styles.roleChip, { backgroundColor: p.role === 'Captain' ? '#fef3c7' : '#f1f5f9' }]}>
              <Text
                style={[
                  styles.roleText,
                  { color: p.role === 'Captain' ? '#d97706' : theme.colors.textMuted },
                ]}
              >
                {p.role}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Recent Fixtures</Text>
        {fixtures.map((f, idx) => (
          <View key={idx} style={styles.fixtureCard}>
            <View style={styles.fixtureDate}>
              <Text style={styles.fixtureDateText}>{f.date}</Text>
            </View>
            <View style={styles.fixtureBody}>
              <Text style={styles.fixtureVs}>{f.vs}</Text>
              <Text style={styles.fixtureVenue}>{f.venue}</Text>
            </View>
            <View
              style={[
                styles.fixtureChip,
                {
                  backgroundColor:
                    f.result === 'Upcoming' ? '#dbeafe' : f.result.startsWith('Won') ? '#dcfce7' : '#fee2e2',
                },
              ]}
            >
              <Text
                style={[
                  styles.fixtureText,
                  {
                    color:
                      f.result === 'Upcoming' ? '#2563eb' : f.result.startsWith('Won') ? '#059669' : '#dc2626',
                  },
                ]}
              >
                {f.result}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  teamName: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    marginTop: 10,
  },
  teamMeta: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  addCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  addTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  confirmText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
  },
  playerBody: { flex: 1 },
  playerName: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  playerMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  roleChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
  fixtureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  fixtureDate: {
    width: 46,
    alignItems: 'center',
  },
  fixtureDateText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  fixtureBody: { flex: 1, marginLeft: 10 },
  fixtureVs: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.text,
  },
  fixtureVenue: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  fixtureChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  fixtureText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
});