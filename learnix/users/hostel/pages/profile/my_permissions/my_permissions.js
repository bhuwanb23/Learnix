/**
 * What this role is actually allowed to do.
 *
 * The list is READ from the platform's RBAC map, which is administered live and audited. It is not
 * a client-side list of what a "warden" can do — that would be a second copy of a rule the server
 * owns, and it would drift the first time somebody was promoted or a permission was revoked.
 *
 * The HOSTEL permissions come first, because that is the desk this profile belongs to. The others are
 * still listed: a warden who also holds the ADMIN role can do more than the hostel, and hiding that
 * would be its own kind of lie.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, SkeletonCard } from '../../../../components/ui';
import { hostelApi } from '../../../../services/api';

export default function MyPermissions({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (mode) => {
    try {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setData(await hostelApi.profilePermissions());
    } catch (e) {
      setError(e.message || 'Could not load your permissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
    >
      <TouchableOpacity style={styles.back} onPress={() => navigation?.goBack?.()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Access &amp; permissions</Text>
      <Text style={styles.sub}>
        {data?.roles?.length
          ? `Your ${data.roles.join(', ')} role${data.roles.length === 1 ? '' : 's'} grant ${data.total} permission${data.total === 1 ? '' : 's'}.`
          : 'Your account holds no role that grants permissions.'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {(data?.hostelPermissions ?? []).length > 0 ? (
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Hostel desk</Text>
          {data.hostelPermissions.map((p) => (
            <View key={p.key} style={styles.permRow}>
              <Ionicons name="checkmark-circle" size={15} color={theme.colors.success} />
              <View style={styles.flex}>
                <Text style={styles.permKey}>{p.key}</Text>
                <Text style={styles.permName}>{p.name}</Text>
              </View>
              <Text style={styles.permRoles}>{p.roles.join(', ')}</Text>
            </View>
          ))}
        </AnimatedCard>
      ) : null}

      {(data?.groups ?? []).map((g) => (
        <AnimatedCard key={g.category} style={styles.card}>
          <Text style={styles.sectionTitle}>{g.category}</Text>
          {g.permissions.map((p) => (
            <View key={p.key} style={styles.permRow}>
              <Ionicons name="checkmark-circle" size={15} color={theme.colors.success} />
              <View style={styles.flex}>
                <Text style={styles.permKey}>{p.key}</Text>
                <Text style={styles.permName}>{p.name}</Text>
              </View>
              <Text style={styles.permRoles}>{p.roles.join(', ')}</Text>
            </View>
          ))}
        </AnimatedCard>
      ))}

      {(data?.total ?? 0) === 0 ? (
        <AnimatedCard style={styles.card}>
          <Text style={styles.muted}>
            No permissions are granted to your role. Ask the administrator if that is not right.
          </Text>
        </AnimatedCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
  error: { color: theme.colors.error, fontSize: 13 },
  card: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  muted: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  permKey: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  permName: { fontSize: 11, color: theme.colors.textMuted },
  permRoles: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },
});
