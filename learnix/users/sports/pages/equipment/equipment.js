import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { sportsApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';

const CONDITION_STYLE = {
  GOOD: { bg: '#dbeafe', color: '#2563eb' },
  NEEDS_REPAIR: { bg: '#fef3c7', color: '#d97706' },
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

export default function EquipmentModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('Inventory');
  const [showAdd, setShowAdd] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [form, setForm] = useState({ name: '', totalUnits: '', rollNo: '', dueAt: '' });
  const [issueItemId, setIssueItemId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const d = await sportsApi.equipment();
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load equipment');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const addEquipment = async () => {
    const units = parseInt(form.totalUnits, 10);
    if (!form.name.trim() || !units || units < 1) {
      Alert.alert('Incomplete', 'Enter a name and a valid unit count.');
      return;
    }
    try {
      await sportsApi.addEquipment({ name: form.name.trim(), totalUnits: units, category: 'SPORTS', condition: 'GOOD' });
      Alert.alert('Added', `${form.name.trim()} added to inventory.`);
      setForm({ name: '', totalUnits: '', rollNo: '', dueAt: '' });
      setShowAdd(false);
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const issueEquipment = async () => {
    if (!form.rollNo.trim() || !form.dueAt.trim()) {
      Alert.alert('Incomplete', 'Enter the student roll no and a due date (YYYY-MM-DD).');
      return;
    }
    try {
      const res = await sportsApi.issueEquipment(issueItemId, form.rollNo.trim(), form.dueAt.trim());
      Alert.alert('Issued', `${res.item} issued to ${res.student}. They were notified.`);
      setForm({ name: '', totalUnits: '', rollNo: '', dueAt: '' });
      setShowIssue(false);
      setIssueItemId(null);
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const returnItem = async (issueId, itemName, studentName) => {
    try {
      await sportsApi.returnEquipment(issueId);
      Alert.alert('Returned', `${itemName} returned by ${studentName} — inventory updated.`);
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <SkeletonStatRow style={{ marginTop: 16 }} />
        <View style={{ marginTop: 14 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  if (error && !data) {
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

  const { stats, inventory, issued } = data;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalItems}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.issuedOut}</Text>
          <Text style={styles.statLabel}>Issued Out</Text>
        </View>
        <View style={[styles.statCard, stats.overdue > 0 && { borderColor: '#fecaca' }]}>
          <Text style={[styles.statValue, stats.overdue > 0 && { color: '#dc2626' }]}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {['Inventory', 'Issued Out'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        {tab === 'Inventory' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(!showAdd)}>
            <Ionicons name="add" size={15} color="#fff" />
            <Text style={styles.addText}>{showAdd ? 'Close' : 'Add'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {showAdd && (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Equipment name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Table Tennis Set"
            placeholderTextColor="#9ca3af"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
          <Text style={styles.formLabel}>Total units</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={form.totalUnits}
            onChangeText={(v) => setForm({ ...form, totalUnits: v })}
          />
          <TouchableOpacity style={styles.confirmBtn} onPress={addEquipment}>
            <Text style={styles.confirmText}>Add to Inventory</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === 'Inventory' ? (
        inventory.length === 0 ? (
          <EmptyState icon="basketball-outline" title="Inventory empty" subtitle="Add the first item to get started" color="#d97706" />
        ) : (
          inventory.map((item, idx) => {
            const st = CONDITION_STYLE[item.condition] || CONDITION_STYLE.GOOD;
            const pct = item.total > 0 ? Math.round((item.available / item.total) * 100) : 0;
            const color = pct > 50 ? '#059669' : pct > 20 ? '#d97706' : '#dc2626';
            return (
              <AnimatedCard key={item.id} delay={idx * 40} style={styles.card}>
                <View style={styles.itemIcon}>
                  <Ionicons name="basketball-outline" size={18} color="#d97706" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.category} · {item.available}/{item.total} available
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: pct + '%', backgroundColor: color }]} />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.issueSmallBtn}
                  onPress={() => {
                    setIssueItemId(item.id);
                    setShowIssue(true);
                  }}
                >
                  <Text style={styles.issueSmallText}>Issue</Text>
                </TouchableOpacity>
                <View style={[styles.condChip, { backgroundColor: st.bg }]}>
                  <Text style={[styles.condText, { color: st.color }]}>{item.condition.replace('_', ' ')}</Text>
                </View>
              </AnimatedCard>
            );
          })
        )
      ) : (
        <>
          {showIssue && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Issue equipment</Text>
              <Text style={styles.formLabel}>Student roll no</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CSE-23-014"
                placeholderTextColor="#9ca3af"
                value={form.rollNo}
                onChangeText={(v) => setForm({ ...form, rollNo: v })}
              />
              <Text style={styles.formLabel}>Due date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2026-09-30"
                placeholderTextColor="#9ca3af"
                value={form.dueAt}
                onChangeText={(v) => setForm({ ...form, dueAt: v })}
              />
              <TouchableOpacity style={styles.confirmBtn} onPress={issueEquipment}>
                <Text style={styles.confirmText}>Confirm Issue</Text>
              </TouchableOpacity>
            </View>
          )}
          {issued.length === 0 && <EmptyState icon="archive-outline" title="Nothing issued" subtitle="All equipment is in inventory" color="#059669" />}
          {issued.map((i, idx) => (
            <AnimatedCard key={i.id} delay={idx * 40} style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{i.student.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.itemName}>{i.item}</Text>
                <Text style={styles.itemMeta}>
                  {i.student} · Issued {fmtDate(i.issuedAt)}
                </Text>
                <Text style={[styles.dueText, { color: i.status === 'OVERDUE' ? '#dc2626' : theme.colors.textMuted }]}>
                  Due {fmtDate(i.dueAt)} {i.status === 'OVERDUE' ? '· OVERDUE' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.returnBtn, { backgroundColor: i.status === 'OVERDUE' ? '#fee2e2' : '#dcfce7' }]}
                onPress={() => returnItem(i.id, i.item, i.student)}
              >
                <Text style={[styles.returnText, { color: i.status === 'OVERDUE' ? '#dc2626' : '#059669' }]}>
                  Return
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
      </ScrollView>
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  tab: {
    paddingHorizontal: 14,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 'auto',
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 12,
  },
  formTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 6,
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
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 12,
  },
  confirmText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#d977061a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  itemName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  itemMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: { height: 5, borderRadius: 3 },
  condChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  condText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  issueSmallBtn: {
    borderRadius: 9,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 6,
  },
  issueSmallText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
  },
  dueText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    marginTop: 4,
  },
  returnBtn: {
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  returnText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
  },
});
