import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { libraryApi } from '../../../../services/api';
import { theme } from '../../../../constants/theme';

export default function DigitalLibrary({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('Resources');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.digitalResources();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const resources = data?.resources || [];
  const stats = data?.stats || {};
  const types = ['All', ...new Set(resources.map((r) => r.type))];
  const filtered = activeCategory === 'All' ? resources : resources.filter((r) => r.type === activeCategory);

  const getTypeColor = (type) => {
    switch (type) {
      case 'PDF': return '#2563eb';
      case 'EBOOK': return '#0891b2';
      case 'JOURNAL': return '#059669';
      default: return '#64748b';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'PDF': return 'book';
      case 'EBOOK': return 'book-outline';
      case 'JOURNAL': return 'newspaper';
      default: return 'document';
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading digital library…</Text></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Digital Library</Text>
          <View style={styles.headerIconBtn} />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total ?? 0}</Text>
            <Text style={styles.statLabel}>Resources</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalAccessGrants ?? 0}</Text>
            <Text style={styles.statLabel}>Access Grants</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabsRow}>
        {['Resources'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {types.map((cat) => (
            <TouchableOpacity key={cat} style={[styles.chip, activeCategory === cat && styles.chipActive]} onPress={() => setActiveCategory(cat)}>
              <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}><Ionicons name="cloud-outline" size={40} color="#94a3b8" /><Text style={styles.emptyText}>No resources found</Text></View>
        ) : (
          filtered.map((item) => {
            const color = getTypeColor(item.type);
            return (
              <View key={item.id} style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: color + '1a' }]}>
                  <Ionicons name={getTypeIcon(item.type)} size={22} color={color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardAuthor} numberOfLines={1}>{item.subject || 'General'}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.typeChip, { backgroundColor: color + '14' }]}>
                      <Text style={[styles.typeText, { color }]}>{item.type}</Text>
                    </View>
                    {item.license ? <Text style={styles.metaText}>{item.license}</Text> : null}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Text style={styles.downloadText}>{item.accessCount} views</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  header: { paddingTop: theme.spacing.xl + 10, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope-Bold', color: '#fff' },
  headerIconBtn: { width: 40, height: 40 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.lg },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  statLabel: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 8 },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.primary },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  chipsRow: { flexDirection: 'row', paddingVertical: theme.spacing.md, flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.colors.surfaceMuted, marginRight: 8 },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },
  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 20 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 12 },
  iconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  cardAuthor: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  typeText: { fontSize: 10, fontFamily: 'Manrope-Bold' },
  metaText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  cardActions: { alignItems: 'flex-end', marginLeft: 8 },
  downloadText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
});
