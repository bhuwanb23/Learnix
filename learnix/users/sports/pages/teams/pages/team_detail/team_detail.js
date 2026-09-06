import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { sportsApi } from '../../../../../../services/api';

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

export default function TeamDetail({ teamId, onBack }) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [rollNo, setRollNo] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await sportsApi.teamDetail(teamId);
      setTeam(data);
    } catch (e) {
      setError(e.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const addPlayer = async () => {
    if (!rollNo.trim()) {
      Alert.alert('Missing roll no', 'Enter the student roll number to add them to the roster.');
      return;
    }
    try {
      const res = await sportsApi.addPlayer(teamId, rollNo.trim());
      Alert.alert('Player added', `${res.name} joined the roster and was notified.`);
      setRollNo('');
      setShowAdd(false);
      load();
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !team) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Team not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const record = team.record || { played: 0, won: 0, lost: 0, points: 0 };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroIconWrap}>
            <Ionicons name="people" size={28} color="#fff" />
          </View>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamMeta}>
            {team.members.length} players · Captain {team.captain || '—'}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{team.members.length}</Text>
              <Text style={styles.heroStatLabel}>Players</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{record.won}</Text>
              <Text style={styles.heroStatLabel}>Wins</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{record.lost}</Text>
              <Text style={styles.heroStatLabel}>Losses</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{record.points}</Text>
              <Text style={styles.heroStatLabel}>Points</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAdd(!showAdd)}>
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{showAdd ? 'Cancel' : 'Add Player'}</Text>
          </TouchableOpacity>
        </View>

        {showAdd && (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Add player to {team.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Student roll no — e.g. CSE-23-014"
              placeholderTextColor="#9ca3af"
              value={rollNo}
              onChangeText={setRollNo}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={addPlayer}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
              <Text style={styles.confirmText}>Add to Roster</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Roster</Text>
          <Text style={styles.sectionCount}>{team.members.length} players</Text>
        </View>
        {team.members.map((p) => (
          <View key={p.id} style={styles.playerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.name.charAt(0)}</Text>
            </View>
            <View style={styles.playerBody}>
              <Text style={styles.playerName}>{p.name}</Text>
              <Text style={styles.playerMeta}>{p.role === 'CAPTAIN' ? 'Team captain' : 'Player'}</Text>
            </View>
            <View
              style={[styles.roleChip, { backgroundColor: p.role === 'CAPTAIN' ? '#fef3c7' : '#f1f5f9' }]}
            >
              <Text
                style={[
                  styles.roleText,
                  { color: p.role === 'CAPTAIN' ? '#d97706' : theme.colors.textMuted },
                ]}
              >
                {p.role}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitleFlat}>Fixtures</Text>
        {team.fixtures.length === 0 && (
          <Text style={styles.empty}>No fixtures for this team yet.</Text>
        )}
        {team.fixtures.map((f) => {
          const completed = f.status === 'COMPLETED' && f.result;
          const won = completed && f.result.winner === f.side;
          const draw = completed && f.result.winner === 'DRAW';
          const label = !completed
            ? f.status === 'TODAY' ? 'Today' : 'Upcoming'
            : draw ? `Draw ${f.result.scoreA}-${f.result.scoreB}`
            : won ? `Won ${f.result.scoreA}-${f.result.scoreB}`
            : `Lost ${f.result.scoreA}-${f.result.scoreB}`;
          const chipBg = !completed ? '#dbeafe' : draw ? '#f1f5f9' : won ? '#dcfce7' : '#fee2e2';
          const chipColor = !completed ? '#2563eb' : draw ? '#64748b' : won ? '#059669' : '#dc2626';
          return (
            <View key={f.id} style={styles.fixtureCard}>
              <View style={styles.fixtureDate}>
                <Text style={styles.fixtureDateText}>{fmtDate(f.date)}</Text>
              </View>
              <View style={styles.fixtureBody}>
                <Text style={styles.fixtureVs}>vs {f.opponent}</Text>
                <Text style={styles.fixtureVenue}>{team.sport}</Text>
              </View>
              <View style={[styles.fixtureChip, { backgroundColor: chipBg }]}>
                <Text style={[styles.fixtureText, { color: chipColor }]}>{label}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
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
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 10,
  },
  teamMeta: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
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
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
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
    fontFamily: 'Manrope-Bold',
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
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
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
    fontFamily: 'Manrope-Bold',
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
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  sectionTitleFlat: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
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
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  playerBody: { flex: 1 },
  playerName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  playerMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
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
    fontFamily: 'Manrope-Bold',
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
    width: 52,
    alignItems: 'center',
  },
  fixtureDateText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  fixtureBody: { flex: 1, marginLeft: 10 },
  fixtureVs: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  fixtureVenue: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
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
    fontFamily: 'Manrope-Bold',
  },
});
