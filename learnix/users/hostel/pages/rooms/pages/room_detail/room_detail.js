import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { hostelApi } from '../../../../../../services/api';

export default function RoomDetail({ roomNumber, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [studentRoll, setStudentRoll] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await hostelApi.roomDetail(roomNumber));
    } catch (e) {
      setError(e.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAllocate = async () => {
    if (!studentRoll.trim()) {
      Alert.alert('Incomplete', 'Enter the student roll number.');
      return;
    }
    setBusy(true);
    try {
      const res = await hostelApi.allocate(studentRoll.trim().toUpperCase(), roomNumber);
      setStudentRoll('');
      setShowForm(false);
      Alert.alert('Allocated', `${res.student} allotted bed ${res.bedLabel}.`);
      await load();
    } catch (e) {
      Alert.alert('Cannot allocate', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVacate = (resident) => {
    Alert.alert('Vacate Bed', `Remove ${resident.name} from bed ${resident.bedLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Vacate',
        style: 'destructive',
        onPress: async () => {
          try {
            await hostelApi.vacateBed(resident.bedId);
            Alert.alert('Vacated', `${resident.name} has been checked out of ${roomNumber}.`);
            await load();
          } catch (e) {
            Alert.alert('Cannot vacate', e.message);
          }
        },
      },
    ]);
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Loading room…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const occupied = data.residents.length;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.roomId}>{data.number}</Text>
          <Text style={styles.roomSub}>
            {data.block} · Floor {data.floor} · {occupied}/{data.capacity} beds occupied
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{data.capacity - occupied}</Text>
              <Text style={styles.heroStatLabel}>Beds Free</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{occupied}</Text>
              <Text style={styles.heroStatLabel}>Residents</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>₹35,000</Text>
              <Text style={styles.heroStatLabel}>Rent / Month</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.actionPrimaryText}>
              {showForm ? 'Cancel' : 'Allocate Resident'}
            </Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Allocate a bed in {data.number}</Text>
            <Text style={styles.formLabel}>Student Roll Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. STU-2026-001"
              autoCapitalize="characters"
              value={studentRoll}
              onChangeText={setStudentRoll}
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.formHint}>
              The first vacant bed is assigned automatically and rent dues are generated.
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, busy && { opacity: 0.6 }]}
              onPress={handleAllocate}
              disabled={busy}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.confirmText}>{busy ? 'Allocating…' : 'Confirm Allocation'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Residents</Text>
        {data.residents.map((r) => (
          <View key={r.allocationId} style={styles.residentCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{r.name.charAt(0)}</Text>
            </View>
            <View style={styles.residentBody}>
              <Text style={styles.residentName}>{r.name}</Text>
              <Text style={styles.residentMeta}>{r.phone || 'No phone on file'}</Text>
              <Text style={styles.bedChip}>Bed {r.bedLabel}</Text>
            </View>
            <TouchableOpacity style={styles.vacateBtn} onPress={() => handleVacate(r)}>
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.vacateText}>Vacate</Text>
            </TouchableOpacity>
          </View>
        ))}
        {data.residents.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="bed-outline" size={28} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>Room is vacant — allocate a resident.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  retryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roomId: {
    fontSize: 28,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  roomSub: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  actionPrimary: { backgroundColor: theme.colors.primary },
  actionPrimaryText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 6,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  formTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
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
  formHint: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  confirmText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  residentCard: {
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  residentBody: { flex: 1 },
  residentName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  residentMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  bedChip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    marginTop: 5,
  },
  vacateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vacateText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#dc2626',
    marginLeft: 4,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 8,
  },
});
