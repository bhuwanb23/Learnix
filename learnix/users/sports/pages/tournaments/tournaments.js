import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { sportsApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../components/ui';

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

export default function TournamentsModule({ navigation }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('Fixtures');
  const [showSchedule, setShowSchedule] = useState(false);
  const [resultFor, setResultFor] = useState(null);
  const [form, setForm] = useState({ scoreA: '', scoreB: '' });
  const [scheduleForm, setScheduleForm] = useState({ teamA: '', teamB: '', date: '' });

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await sportsApi.tournaments();
      setTournaments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const submitResult = async (winner) => {
    const a = parseInt(form.scoreA, 10);
    const b = parseInt(form.scoreB, 10);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      Alert.alert('Invalid score', 'Enter valid scores for both teams.');
      return;
    }
    try {
      await sportsApi.recordResult(resultFor.id, winner, a, b);
      Alert.alert('Result recorded', 'Standings updated automatically.');
      setResultFor(null);
      setForm({ scoreA: '', scoreB: '' });
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const scheduleFixture = async () => {
    const t = tournaments[0];
    if (!t) {
      Alert.alert('No tournament', 'There is no tournament to schedule into yet.');
      return;
    }
    const teamA = t.standings.find((s) => s.team.toLowerCase().includes(scheduleForm.teamA.toLowerCase().trim()));
    const teamB = t.standings.find((s) => s.team.toLowerCase().includes(scheduleForm.teamB.toLowerCase().trim()));
    if (!scheduleForm.date.trim()) {
      Alert.alert('Missing date', 'Enter the fixture date (YYYY-MM-DD).');
      return;
    }
    if (!teamA || !teamB) {
      Alert.alert('Teams not found', `Could not match both team names in ${t.name}. Teams: ${t.standings.map((s) => s.team).join(', ')}`);
      return;
    }
    try {
      const res = await sportsApi.scheduleFixture({
        tournamentId: t.id,
        teamAId: teamA.team,
        teamBId: teamB.team,
        fixtureDate: scheduleForm.date.trim(),
      });
      Alert.alert('Fixture scheduled', res.match);
      setShowSchedule(false);
      setScheduleForm({ teamA: '', teamB: '', date: '' });
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  if (loading && tournaments.length === 0) {
    return (
      <View style={styles.center}>
        <SkeletonCard style={{ marginTop: 16 }} />
        <SkeletonCard style={{ marginTop: 10 }} />
      </View>
    );
  }

  if (error && tournaments.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // result modal needs real team ids — resolve from raw fixture payload
  const openResult = (fixture) => setResultFor(fixture);

  const allFixtures = tournaments.flatMap((t) =>
    t.fixtures.map((f) => ({ ...f, tournamentName: t.name }))
  );
  const allStandings = tournaments.flatMap((t) =>
    t.standings.map((s, idx) => ({ ...s, pos: idx + 1, tournamentName: t.name }))
  );

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
        <TouchableOpacity style={styles.newBtnSmall} onPress={() => setShowSchedule(true)}>
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={styles.newBtnSmallText}>Fixture</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
      >
        {tab === 'Fixtures' ? (
          <>
            {allFixtures.length === 0 && <EmptyState icon="football-outline" title="No fixtures yet" subtitle="Schedule a fixture to get started" color="#d97706" />}
            {allFixtures.map((f, idx) => (
              <AnimatedCard key={f.id} delay={idx * 40} style={styles.card}>
                <View style={styles.tournamentRow}>
                  <View style={styles.trophyIcon}>
                    <Ionicons name="trophy-outline" size={14} color="#d97706" />
                  </View>
                  <Text style={styles.tournamentName}>{f.tournamentName}</Text>
                </View>
                <Text style={styles.match}>{f.teamA} vs {f.teamB}</Text>
                <Text style={styles.meta}>{fmtDate(f.date)}</Text>
                {f.status === 'COMPLETED' && f.result ? (
                  <View style={styles.resultBox}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                    <Text style={styles.resultText}>
                      {f.result.winner === 'DRAW'
                        ? `Draw ${f.result.scoreA}-${f.result.scoreB}`
                        : `${f.result.winner === 'A' ? f.teamA : f.teamB} won ${f.result.scoreA}-${f.result.scoreB}`}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.resultBtn} onPress={() => openResult(f)}>
                    <Ionicons name="create-outline" size={13} color={theme.colors.primary} />
                    <Text style={styles.resultBtnText}>Enter Result</Text>
                  </TouchableOpacity>
                )}
              </AnimatedCard>
            ))}
          </>
        ) : (
          <>
            {allStandings.length === 0 && <EmptyState icon="trophy-outline" title="No standings yet" subtitle="Record results to build the table" color="#d97706" />}
            <AnimatedCard delay={0} style={styles.standingsCard}>
              <View style={styles.standingsHeader}>
                <Text style={[styles.headerCell, styles.posCol]}>#</Text>
                <Text style={[styles.headerCell, styles.teamCol]}>Team</Text>
                <Text style={styles.headerCell}>P</Text>
                <Text style={styles.headerCell}>W</Text>
                <Text style={styles.headerCell}>Pts</Text>
              </View>
              {allStandings.map((s) => (
                <View key={`${s.tournamentName}-${s.team}`} style={styles.standingsRow}>
                  <Text style={[styles.posText, styles.posCol]}>{s.pos}</Text>
                  <View style={styles.teamCol}>
                    <Text style={styles.teamText}>{s.team}</Text>
                    <Text style={styles.teamSub}>{s.tournamentName}</Text>
                  </View>
                  <Text style={styles.numText}>{s.played}</Text>
                  <Text style={styles.numText}>{s.won}</Text>
                  <Text style={[styles.numText, styles.ptsText]}>{s.points}</Text>
                </View>
              ))}
            </AnimatedCard>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                Standings update automatically when a result is recorded — 3 points for a win, 1 for a draw.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Schedule fixture modal */}
      <Modal visible={showSchedule} transparent animationType="fade" onRequestClose={() => setShowSchedule(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schedule Fixture</Text>
            <Text style={styles.modalSub}>Team names are matched against the first tournament.</Text>
            <TextInput
              style={styles.input}
              placeholder="Team A name (partial ok)"
              placeholderTextColor="#9ca3af"
              value={scheduleForm.teamA}
              onChangeText={(v) => setScheduleForm({ ...scheduleForm, teamA: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Team B name (partial ok)"
              placeholderTextColor="#9ca3af"
              value={scheduleForm.teamB}
              onChangeText={(v) => setScheduleForm({ ...scheduleForm, teamB: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#9ca3af"
              value={scheduleForm.date}
              onChangeText={(v) => setScheduleForm({ ...scheduleForm, date: v })}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowSchedule(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={scheduleFixture}>
                <Text style={styles.modalSaveText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Result entry modal */}
      <Modal visible={!!resultFor} transparent animationType="fade" onRequestClose={() => setResultFor(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Result</Text>
            {resultFor && (
              <Text style={styles.modalSub}>{resultFor.teamA} vs {resultFor.teamB}</Text>
            )}
            <TextInput
              style={styles.input}
              placeholder={`Score ${resultFor?.teamA ?? 'A'}`}
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.scoreA}
              onChangeText={(v) => setForm({ ...form, scoreA: v })}
            />
            <TextInput
              style={styles.input}
              placeholder={`Score ${resultFor?.teamB ?? 'B'}`}
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.scoreB}
              onChangeText={(v) => setForm({ ...form, scoreB: v })}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSave]}
                onPress={() => submitResult(resultFor.winnerSide === 'B' ? 'B' : 'A')}
              >
                <Text style={styles.modalSaveText}>A Won</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSave]}
                onPress={() => submitResult(resultFor.winnerSide === 'A' ? 'A' : 'B')}
              >
                <Text style={styles.modalSaveText}>B Won</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => submitResult('DRAW')}>
              <Text style={styles.modalCancelText}>Record Draw</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 24 },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  newBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 'auto',
  },
  newBtnSmallText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
  list: { paddingTop: 12, paddingBottom: 24 },
  card: {
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
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  match: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
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
    fontFamily: 'Manrope-Bold',
    color: '#059669',
    marginLeft: 4,
  },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  resultBtnText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  standingsCard: {
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
    fontFamily: 'Manrope-Bold',
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
  posCol: { width: 30 },
  teamCol: { flex: 1 },
  posText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  teamText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  teamSub: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  numText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  ptsText: {
    fontFamily: 'Manrope-ExtraBold',
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
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginLeft: 8,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
    marginBottom: 10,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginTop: 8,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  modalSave: { backgroundColor: theme.colors.primary },
  modalSaveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  modalCancel: { backgroundColor: theme.colors.surfaceMuted, marginTop: 8 },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
});
