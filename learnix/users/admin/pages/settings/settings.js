import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { api } from '../../../../services/api';

export default function SettingsScreen({ navigation }) {
  const [data, setData] = useState({ academicYears: [], systemConfigs: [], featureFlags: [], roles: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.adminApi.settings();
      setData({
        academicYears: d.academicYears || [],
        systemConfigs: d.systemConfigs || [],
        featureFlags: d.featureFlags || [],
        roles: d.roles || [],
      });
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Academic Years */}
      <Text style={styles.sectionTitle}>Academic Years</Text>
      {data.academicYears.map((ay, i) => (
        <View key={ay.id || i} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="calendar" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{ay.label}</Text>
            <Text style={styles.cardDesc}>{ay.startDate} — {ay.endDate}</Text>
          </View>
          {ay.isCurrent && <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}><Text style={[styles.badgeText, { color: '#059669' }]}>Current</Text></View>}
        </View>
      ))}

      {/* System Configs */}
      <Text style={styles.sectionTitle}>System Configuration</Text>
      {data.systemConfigs.map((cfg, i) => (
        <View key={cfg.id || i} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="settings" size={18} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{cfg.key}</Text>
            <Text style={styles.cardDesc} numberOfLines={1}>{cfg.value}</Text>
          </View>
        </View>
      ))}

      {/* Feature Flags */}
      <Text style={styles.sectionTitle}>Feature Flags</Text>
      {data.featureFlags.map((flag, i) => (
        <View key={flag.id || i} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: flag.enabled ? '#dcfce7' : '#fef2f2' }]}>
            <Ionicons name={flag.enabled ? 'flag' : 'flag-outline'} size={18} color={flag.enabled ? '#059669' : '#dc2626'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{flag.key}</Text>
            <Text style={styles.cardDesc}>{flag.description || 'No description'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: flag.enabled ? '#dcfce7' : '#fef2f2' }]}>
            <Text style={[styles.badgeText, { color: flag.enabled ? '#059669' : '#dc2626' }]}>
              {flag.enabled ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>
      ))}

      {/* Roles */}
      <Text style={styles.sectionTitle}>Roles & Permissions</Text>
      {data.roles.map((role, i) => (
        <View key={role.id || i} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: '#faf5ff' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{role.name}</Text>
            <Text style={styles.cardDesc}>{role.permissionCount || role.permissions?.length || 0} permissions</Text>
          </View>
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-SemiBold', color: '#0f172a', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  cardDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: 'Manrope-SemiBold' },
});
