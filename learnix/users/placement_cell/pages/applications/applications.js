import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { APPLICATION_STATS, APPLICATIONS, STATUS_FILTERS } from './constants/applicationsData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = {
  Applied: '#2563eb',
  'Under Review': '#d97706',
  Shortlisted: '#059669',
  Rejected: '#dc2626',
};

export default function ApplicationsModule({ navigation }) {
  const [filter, setFilter] = useState('all');
  const [applications, setApplications] = useState(APPLICATIONS);

  const filteredApps = applications.filter((a) => (filter === 'all' ? true : a.status === filter));

  const handleShortlist = (app) => {
    Alert.alert(
      'Shortlist Candidate',
      `Shortlist ${app.name} for ${app.company} — ${app.role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shortlist',
          onPress: () => {
            setApplications((prev) =>
              prev.map((a) => (a.id === app.id ? { ...a, status: 'Shortlisted' } : a))
            );
            Alert.alert('Shortlisted', `${app.name} notified and moved to the next round.`);
          },
        },
      ]
    );
  };

  const handleReject = (app) => {
    Alert.alert(
      'Reject Application',
      `Reject ${app.name}'s application for ${app.company}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            setApplications((prev) =>
              prev.map((a) => (a.id === app.id ? { ...a, status: 'Rejected' } : a))
            );
            Alert.alert('Rejected', `${app.name} has been notified.`);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {APPLICATION_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.listLabel}>{filteredApps.length} applications</Text>

      {filteredApps.map((app) => (
        <View key={app.id} style={styles.appCard}>
          <View style={[styles.appAvatar, { backgroundColor: app.color + '14' }]}>
            <Text style={[styles.appInitial, { color: app.color }]}>{app.name.charAt(0)}</Text>
          </View>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appMeta}>{app.rollNo} • {app.company} — {app.role}</Text>
            <Text style={styles.appTime}>Applied {app.appliedAt}</Text>
            <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[app.status] + '1A' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[app.status] }]}>{app.status}</Text>
            </View>
          </View>
          {app.status === 'Applied' || app.status === 'Under Review' ? (
            <View style={styles.appActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleShortlist(app)} activeOpacity={0.7}>
                <Ionicons name="checkmark" size={16} color="#059669" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleReject(app)} activeOpacity={0.7}>
                <Ionicons name="close" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Manrope-Medium',
    marginBottom: 10,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  appAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appInitial: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  appMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  appTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  appActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});