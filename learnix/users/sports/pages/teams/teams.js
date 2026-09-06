import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { sportsApi } from '../../../../services/api';
import TeamDetail from './pages/team_detail/team_detail';

const SPORT_ICONS = {
  Football: 'football-outline',
  Cricket: 'baseball-outline',
  Basketball: 'basketball-outline',
  Badminton: 'tennisball-outline',
  Athletics: 'fitness-outline',
  Cultural: 'musical-notes-outline',
};

const SPORT_COLORS = {
  Football: '#059669',
  Cricket: '#2563eb',
  Basketball: '#d97706',
  Badminton: '#0891b2',
  Athletics: '#dc2626',
  Cultural: '#7c3aed',
};

export default function TeamsModule({ navigation }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await sportsApi.teams();
      setTeams(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load teams');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (selectedTeamId) {
    return (
      <TeamDetail
        teamId={selectedTeamId}
        onBack={() => {
          setSelectedTeamId(null);
          load(false);
        }}
      />
    );
  }

  const totalPlayers = teams.reduce((s, t) => s + t.members, 0);

  if (loading && teams.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && teams.length === 0) {
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

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{teams.length}</Text>
          <Text style={styles.statLabel}>Active Teams</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalPlayers}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{new Set(teams.map((t) => t.sport)).size}</Text>
          <Text style={styles.statLabel}>Sports</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Teams</Text>
      </View>

      {teams.length === 0 && (
        <Text style={styles.empty}>No teams yet.</Text>
      )}
      {teams.map((t) => {
        const color = SPORT_COLORS[t.sport] || '#2563eb';
        const icon = SPORT_ICONS[t.sport] || 'people-outline';
        return (
          <TouchableOpacity
            key={t.id}
            style={styles.card}
            onPress={() => setSelectedTeamId(t.id)}
          >
            <View style={[styles.teamIcon, { backgroundColor: color + '1a' }]}>
              <Ionicons name={icon} size={19} color={color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{t.name}</Text>
              <Text style={styles.meta}>
                {t.members} players · Captain {t.captain || '—'}
              </Text>
              {t.tournament && <Text style={styles.nextMatch}>{t.tournament}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 20 },
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
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
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
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
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
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  nextMatch: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
    marginTop: 4,
  },
});
