import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';
import { THEME, typeMeta, scopeMeta, formatDate, formatRelative } from '../resourceMeta';

export default function ResourceDetail({ navigation, route }) {
  const resourceId = route?.params?.resourceId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);

  const fetchData = useCallback(async () => {
    if (!resourceId) {
      setError('No resource selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await libraryApi.digitalResource(resourceId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resourceId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRevoke = async (grant) => {
    setBusy(grant.id);
    try {
      await libraryApi.revokeAccess(resourceId, grant.id);
      fetchData();
    } catch (err) {
      Alert.alert('Cannot Revoke', err.message);
    } finally {
      setBusy(null);
    }
  };

  const confirmRevoke = (grant) => {
    Alert.alert(
      'Revoke Access?',
      `Remove ${grant.label} from the audience for "${data.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => handleRevoke(grant) },
      ],
    );
  };

  const handleArchive = async () => {
    setBusy('archive');
    try {
      await libraryApi.deleteDigitalResource(resourceId);
      fetchData();
      Alert.alert('Archived', 'The resource is hidden from students but its history is kept.', [
        { text: 'Done', onPress: fetchData },
      ]);
    } catch (err) {
      Alert.alert('Cannot Archive', err.message);
    } finally {
      setBusy(null);
    }
  };

  const confirmArchive = () => {
    Alert.alert(
      'Archive Resource?',
      `"${data.title}" will be hidden from the student app. Access history is retained. You can restore it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: handleArchive },
      ],
    );
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      await libraryApi.updateDigitalResource(resourceId, { status: 'ACTIVE' });
      fetchData();
      Alert.alert('Restored', 'The resource is visible to students again.');
    } catch (err) {
      Alert.alert('Cannot Restore', err.message);
    } finally {
      setBusy(null);
    }
  };

  const openExternal = async () => {
    if (!data.externalUrl) return;
    const url = data.externalUrl.startsWith('http') ? data.externalUrl : `https://${data.externalUrl}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Cannot Open', 'No app on this device can open that link.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Cannot Open', 'The link could not be opened on this device.');
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = typeMeta(data.type);
  const archived = data.status === 'ARCHIVED';

  const facts = [
    { label: 'Type', value: meta.label },
    { label: 'Subject', value: data.subject || '—' },
    { label: 'Publisher', value: data.publisher || '—' },
    { label: 'License', value: data.license || '—' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Hero */}
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: meta.color + '14' }]}>
            <Ionicons name={meta.icon} size={28} color={meta.color} />
          </View>
          <Text style={styles.heroTitle}>{data.title}</Text>
          {data.publisher ? <Text style={styles.heroSub}>{data.publisher}</Text> : null}
          <View style={styles.heroChips}>
            <View style={[styles.heroChip, { backgroundColor: meta.color + '1A' }]}>
              <Text style={[styles.heroChipText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {archived && (
              <View style={styles.archivedChip}>
                <Ionicons name="archive-outline" size={10} color="#64748b" />
                <Text style={styles.archivedText}>Archived</Text>
              </View>
            )}
            {data.isPublic && (
              <View style={styles.publicChip}>
                <Ionicons name="globe-outline" size={10} color="#059669" />
                <Text style={styles.publicText}>Open access</Text>
              </View>
            )}
          </View>
          {data.description ? <Text style={styles.heroDesc}>{data.description}</Text> : null}
        </View>
      </AnimatedCard>

      {data.externalUrl ? (
        <AnimatedCard delay={60} style={styles.block}>
          <TouchableOpacity style={styles.linkRow} onPress={openExternal} activeOpacity={0.85}>
            <View style={styles.linkIcon}>
              <Ionicons name="open-outline" size={17} color={THEME} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Open resource</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{data.externalUrl}</Text>
            </View>
            <Ionicons name="arrow-up-forward" size={15} color={THEME} />
          </TouchableOpacity>
        </AnimatedCard>
      ) : null}

      {/* Facts */}
      <AnimatedCard delay={120} style={styles.block}>
        <Text style={styles.cardLabel}>Details</Text>
        <View style={styles.factsGrid}>
          {facts.map((f, i) => (
            <React.Fragment key={f.label}>
              {i % 2 === 1 && <View style={styles.factVLine} />}
              <View style={styles.factCell}>
                <Text style={styles.factLabel}>{f.label}</Text>
                <Text style={styles.factValue} numberOfLines={1}>{f.value}</Text>
              </View>
              {i < facts.length - 2 && <View style={styles.factHLine} />}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.addedText}>Added {formatDate(data.createdAt)}</Text>
      </AnimatedCard>

      {/* Usage */}
      <AnimatedCard delay={180} style={styles.block}>
        <Text style={styles.cardLabel}>Usage</Text>
        <View style={styles.usageRow}>
          <View style={styles.usageCell}>
            <Text style={styles.usageValue}>{data.usage.totalAccesses}</Text>
            <Text style={styles.usageLabel}>Total opens</Text>
          </View>
          <View style={styles.usageDivider} />
          <View style={styles.usageCell}>
            <Text style={styles.usageValue}>{data.usage.accessesLast7}</Text>
            <Text style={styles.usageLabel}>Last 7 days</Text>
          </View>
          <View style={styles.usageDivider} />
          <View style={styles.usageCell}>
            <Text style={styles.usageValue}>{data.grants.length}</Text>
            <Text style={styles.usageLabel}>Audiences</Text>
          </View>
        </View>
        <Text style={styles.lastAccess}>
          Last accessed {formatRelative(data.usage.lastAccessedAt)}
        </Text>

        {data.recentAccess?.length ? (
          <View style={styles.activity}>
            <Text style={styles.activityLabel}>Recent activity</Text>
            {data.recentAccess.slice(0, 5).map((a) => (
              <View key={a.id} style={styles.activityRow}>
                <Ionicons
                  name={a.accessType === 'DOWNLOAD' ? 'download-outline' : 'eye-outline'}
                  size={13}
                  color="#94a3b8"
                />
                <Text style={styles.activityText}>
                  {a.accessType === 'DOWNLOAD' ? 'Downloaded' : 'Opened'} · {formatRelative(a.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noActivity}>No access recorded yet.</Text>
        )}
      </AnimatedCard>

      {/* Audience */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>Access</Text>
        <TouchableOpacity onPress={() => navigation.openModule('AccessGrants', { resourceId })} activeOpacity={0.8}>
          <Text style={styles.linkText}>Manage</Text>
        </TouchableOpacity>
      </View>

      {data.grants.length === 0 ? (
        <AnimatedCard delay={240} style={styles.block}>
          <View style={styles.openAccessBox}>
            <Ionicons name="globe-outline" size={20} color="#059669" />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Open to all students</Text>
              <Text style={styles.rowSub}>No access grants — every student can read this.</Text>
            </View>
          </View>
        </AnimatedCard>
      ) : (
        data.grants.map((g, idx) => {
          const scope = scopeMeta(g.scope);
          return (
            <AnimatedCard key={g.id} delay={240 + idx * 40} style={styles.block}>
              <View style={styles.grantRow}>
                <View style={[styles.grantIcon, { backgroundColor: scope.bg }]}>
                  <Ionicons name={scope.icon} size={17} color={scope.color} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{g.label}</Text>
                  <Text style={styles.rowSub}>{scope.label} · {g.detail}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.revokeBtn, busy === g.id && styles.btnDisabled]}
                  onPress={() => confirmRevoke(g)}
                  activeOpacity={0.8}
                  disabled={busy === g.id}
                >
                  {busy === g.id
                    ? <ActivityIndicator size="small" color="#dc2626" />
                    : <Ionicons name="trash-outline" size={15} color="#dc2626" />}
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          );
        })
      )}

      {/* Actions */}
      <AnimatedCard delay={300} style={[styles.block, styles.actionCard]}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.openModule('ResourceForm', { resourceId })}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={16} color="#2563eb" />
          <Text style={styles.secondaryBtnText}>Edit Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, busy && styles.btnDisabled]}
          onPress={() => navigation.openModule('AccessGrants', { resourceId })}
          activeOpacity={0.85}
          disabled={Boolean(busy)}
        >
          <Ionicons name="key-outline" size={16} color="#2563eb" />
          <Text style={styles.secondaryBtnText}>Grant Access</Text>
        </TouchableOpacity>

        {archived ? (
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={handleRestore}
            activeOpacity={0.85}
            disabled={Boolean(busy)}
          >
            {busy === 'restore'
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="refresh" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>Restore Resource</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.dangerBtn, busy && styles.btnDisabled]}
            onPress={confirmArchive}
            activeOpacity={0.85}
            disabled={Boolean(busy)}
          >
            {busy === 'archive'
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="archive-outline" size={16} color="#fff" />}
            <Text style={styles.dangerBtnText}>Archive Resource</Text>
          </TouchableOpacity>
        )}
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },
  btnDisabled: { opacity: 0.5 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 14 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', textAlign: 'center', lineHeight: 23 },
  heroSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 3 },
  heroChips: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  heroChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  heroChipText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  archivedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: '#f1f5f9' },
  archivedText: { fontSize: 10, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  publicChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: '#f0fdf4' },
  publicText: { fontSize: 10, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold' },
  heroDesc: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular', lineHeight: 18, textAlign: 'center', marginTop: 12 },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  linkIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },

  // Facts
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  factsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  factCell: { width: '50%', paddingVertical: 8, paddingRight: 8 },
  factVLine: { width: 1, backgroundColor: '#eef2f7', marginVertical: 4 },
  factHLine: { height: 1, backgroundColor: '#eef2f7', width: '100%' },
  factLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  factValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold', marginTop: 3 },
  addedText: { fontSize: 10, color: '#cbd5e1', fontFamily: 'Manrope-Regular', marginTop: 12 },

  // Usage
  usageRow: { flexDirection: 'row' },
  usageCell: { flex: 1, alignItems: 'center' },
  usageDivider: { width: 1, backgroundColor: '#eef2f7' },
  usageValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  usageLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },
  lastAccess: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium', textAlign: 'center', marginTop: 12 },
  activity: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  activityLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  activityText: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },
  noActivity: { fontSize: 11, color: '#cbd5e1', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 14 },

  // Grants
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  linkText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
  grantRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  grantIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  revokeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', justifyContent: 'center', alignItems: 'center' },
  openAccessBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },

  // Actions
  actionCard: { padding: 14, gap: 10 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: '#bfdbfe' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14 },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 14 },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
});