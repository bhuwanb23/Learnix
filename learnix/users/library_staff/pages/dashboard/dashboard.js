import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, SkeletonStatRow, SkeletonCard, StatusChip, EmptyState } from '../../../../components/ui';
import { BORDER_RADIUS } from '../../../../constants/theme';

const MODULES = [
  { id: 'Catalog', label: 'Catalog', desc: 'Manage books & stock', icon: 'book-outline', color: '#2563eb' },
  { id: 'Circulation', label: 'Circulation', desc: 'Issue & return books', icon: 'swap-horizontal-outline', color: '#059669' },
  { id: 'Fines', label: 'Fines & Overdues', desc: 'Collect & waive fines', icon: 'cash-outline', color: '#d97706' },
  { id: 'Requests', label: 'Book Requests', desc: 'Approve student requests', icon: 'cart-outline', color: '#0284c7' },
  { id: 'DigitalLibrary', label: 'Digital Library', desc: 'E-books & resources', icon: 'cloud-outline', color: '#4f46e5' },
  { id: 'Notifications', label: 'Notify Students', desc: 'Due date reminders', icon: 'megaphone-outline', color: '#dc2626' },
];

export default function LibraryDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.dashboard();
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

  const handleModulePress = (moduleId) => {
    if (moduleId === 'Catalog' || moduleId === 'Circulation' || moduleId === 'Fines') {
      navigation.switchTab(moduleId);
    } else {
      navigation.openModule(moduleId);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Skeleton Hero */}
        <View style={styles.heroCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <View style={{ height: 16, width: 120, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 6 }} />
              <View style={{ height: 12, width: 200, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4 }} />
            </View>
          </View>
          <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 }} />
        </View>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hero = data?.hero || {};
  const stats = data?.stats || {};
  const dueToday = data?.dueToday || [];
  const popular = data?.popular || [];
  const alerts = data?.alerts || [];
  const heroPct = hero.utilizationPct ?? 95;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b45309']} />}
    >
      {/* Hero banner */}
      <AnimatedCard delay={0}>
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="book" size={20} color="#b45309" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Central Library</Text>
              <Text style={styles.heroSubtitle}>
                {hero.totalBooks?.toLocaleString() ?? '\u2014'} books \u2022 {hero.totalIssued?.toLocaleString() ?? '\u2014'} issued \u2022 {hero.totalMembers?.toLocaleString() ?? '\u2014'} members
              </Text>
            </View>
          </View>
          <View style={styles.heroProgressTrack}>
            <View style={[styles.heroProgressFill, { width: `${heroPct}%` }]} />
          </View>
          <Text style={styles.heroNote}>{heroPct}% of the collection is available{hero.overdueCount ? ` \u2014 ${hero.overdueCount} book${hero.overdueCount === 1 ? '' : 's'} overdue` : ''}</Text>
        </View>
      </AnimatedCard>

      {/* Stats */}
      <AnimatedCard delay={80}>
        <View style={styles.statsRow}>
          {[
            { id: 'books', label: 'Total Books', value: stats.totalBooks?.toLocaleString() ?? '0', icon: 'book', color: '#2563eb', tab: 'Catalog' },
            { id: 'issued', label: 'Issued', value: stats.issued?.toLocaleString() ?? '0', icon: 'swap-horizontal', color: '#059669', tab: 'Circulation' },
            { id: 'overdue', label: 'Overdue', value: stats.overdue?.toString() ?? '0', icon: 'alert-circle', color: '#dc2626', tab: 'Fines' },
            { id: 'fines', label: 'Fines Due', value: stats.pendingFines?.toString() ?? '0', icon: 'cash', color: '#d97706', tab: 'Fines' },
          ].map((stat) => (
            <TouchableOpacity
              key={stat.id}
              style={styles.statCard}
              activeOpacity={0.8}
              onPress={() => navigation.switchTab(stat.tab)}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </AnimatedCard>

      {/* Due returns */}
      {dueToday.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Returns Due</Text>
            <TouchableOpacity onPress={() => navigation.switchTab('Circulation')} activeOpacity={0.7}>
              <Text style={styles.sectionAction}>View all</Text>
            </TouchableOpacity>
          </View>
          {dueToday.map((item, idx) => (
            <AnimatedCard key={item.id} delay={160 + idx * 60}>
              <View style={styles.dueCard}>
                <View style={[styles.dueIcon, { backgroundColor: (item.isOverdue ? '#dc2626' : '#b45309') + '14' }]}>
                  <Ionicons name="book-outline" size={16} color={item.isOverdue ? '#dc2626' : '#b45309'} />
                </View>
                <View style={styles.dueInfo}>
                  <Text style={styles.dueBook}>{item.book}</Text>
                  <Text style={styles.dueMeta}>{item.student} \u2022 {item.rollNo}</Text>
                </View>
                <View style={[styles.dueChip, { backgroundColor: (item.isOverdue ? '#dc2626' : '#b45309') + '1A' }]}>
                  <Text style={[styles.dueText, { color: item.isOverdue ? '#dc2626' : '#b45309' }]}>
                    {item.isOverdue ? 'Overdue' : 'Due soon'}
                  </Text>
                </View>
              </View>
            </AnimatedCard>
          ))}
        </>
      )}

      {/* Popular books */}
      {popular.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Borrowed</Text>
          </View>
          {popular.map((item, idx) => (
            <AnimatedCard key={item.id} delay={300 + idx * 60}>
              <View 
