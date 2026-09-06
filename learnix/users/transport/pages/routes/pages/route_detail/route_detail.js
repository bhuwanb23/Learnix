import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { transportApi } from '../../../../../../services/api';

export default function RouteDetail({ routeId, onBack }) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showStop, setShowStop] = useState(false);
  const [enrollRoll, setEnrollRoll] = useState('');
  const [enrollStop, setEnrollStop] = useState('');
  const [stopName, setStopName] = useState('');
  const [stopTime, setStopTime] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await transportApi.routeDetail(routeId);
      setRoute(data);
    } catch (e) {
      setError(e.message || 'Failed to load route');
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const sendDelayAlert = async () => {
    if (!route?.bus || !route?.live) {
      Alert.alert('Not live', 'This route has no live GPS position to flag as delayed.');
      return;
    }
    try {
      await transportApi.ping(route.bus.id || route.bus.vehicleId, {
        currentStopOrder: undefined,
        speedKmh: route.live.speedKmh || 0,
        etaMin: (route.live.etaMin || 0) + 15,
        status: 'DELAYED',
      });
      Alert.alert('Delay flagged', 'Enrolled students were notified with the updated ETA.');
      load();
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const enroll = async () => {
    const order = parseInt(enrollStop, 10);
    if (!enrollRoll.trim() || !order) {
      Alert.alert('Incomplete', 'Enter the roll no and stop number.');
      return;
    }
    try {
      const res = await transportApi.enrollStudent(routeId, enrollRoll.trim(), order);
      Alert.alert('Enrolled', `${res.student} picks up at ${res.stop}. Fee due auto-generated.`);
      setEnrollRoll('');
      setEnrollStop('');
      setShowEnroll(false);
      load();
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const addStop = async () => {
    if (!stopName.trim() || !/^\d{2}:\d{2}$/.test(stopTime.trim())) {
      Alert.alert('Incomplete', 'Enter a stop name and time (HH:MM).');
      return;
    }
    try {
      await transportApi.addStop(routeId, stopName.trim(), stopTime.trim());
      Alert.alert('Stop added', `${stopName.trim()} appended to ${route.name}.`);
      setStopName('');
      setStopTime('');
      setShowStop(false);
      load();
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !route) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Route not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const passedCount = route.timeline.filter((s) => s.passed).length;
  const progressPct = route.timeline.length === 0 ? 0 : Math.round((passedCount / route.timeline.length) * 100);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeMeta}>
            {route.distanceKm} km · {route.timeline.length} stops · {route.students} students
          </Text>
          {route.live && (
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: route.live.status === 'ON_TIME' ? '#22c55e' : '#ef4444' }]} />
              <Text style={styles.liveText}>
                {route.live.status === 'ON_TIME' ? 'On time' : 'Delayed'} · ETA {route.live.etaMin ?? '?'} min
                {route.live.at ? ` · at ${route.live.at}` : ''}
              </Text>
            </View>
          )}
          <View style={styles.heroProgress}>
            <View style={[styles.heroProgressFill, { width: `${progressPct}%` }]} />
          </View>
        </LinearGradient>

        {route.bus && (
          <View style={styles.busCard}>
            <View style={styles.busIcon}>
              <Ionicons name="bus-outline" size={20} color="#2563eb" />
            </View>
            <View style={styles.busBody}>
              <Text style={styles.busReg}>{route.bus.regNo}</Text>
              <Text style={styles.busMeta}>
                {route.bus.model} · Driver {route.driver || '—'}
              </Text>
            </View>
            <View
              style={[
                styles.busChip,
                {
                  backgroundColor:
                    route.bus.status === 'ON_ROAD' ? '#dcfce7' : route.bus.status === 'SERVICE' ? '#fee2e2' : '#f1f5f9',
                },
              ]}
            >
              <Text style={styles.busChipText}>{route.bus.status.replace('_', ' ')}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowEnroll(!showEnroll)}>
            <Ionicons name="person-add-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{showEnroll ? 'Cancel' : 'Enroll'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowStop(!showStop)}>
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{showStop ? 'Cancel' : 'Add Stop'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={sendDelayAlert}>
            <Ionicons name="warning-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Delay Alert</Text>
          </TouchableOpacity>
        </View>

        {showEnroll && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Enroll student on {route.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Student roll no — e.g. CSE-23-014"
              placeholderTextColor="#9ca3af"
              value={enrollRoll}
              onChangeText={setEnrollRoll}
            />
            <TextInput
              style={styles.input}
              placeholder={`Stop number (1–${route.timeline.length})`}
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={enrollStop}
              onChangeText={setEnrollStop}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={enroll}>
              <Text style={styles.confirmText}>Enroll & Generate Fee</Text>
            </TouchableOpacity>
          </View>
        )}

        {showStop && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add stop (appends to the end)</Text>
            <TextInput
              style={styles.input}
              placeholder="Stop name — e.g. Jakkur Circle"
              placeholderTextColor="#9ca3af"
              value={stopName}
              onChangeText={setStopName}
            />
            <TextInput
              style={styles.input}
              placeholder="Pickup time (HH:MM)"
              placeholderTextColor="#9ca3af"
              value={stopTime}
              onChangeText={setStopTime}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={addStop}>
              <Text style={styles.confirmText}>Add Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Stop Timeline</Text>
        {route.timeline.map((s, idx) => (
          <View key={s.id} style={styles.stopRow}>
            <View style={styles.stopRail}>
              <View style={[styles.stopDot, { backgroundColor: s.passed ? '#059669' : '#e2e8f0' }]}>
                {s.passed && <Ionicons name="checkmark" size={9} color="#fff" />}
              </View>
              {idx < route.timeline.length - 1 && (
                <View style={[styles.stopLine, { backgroundColor: s.passed ? '#059669' : '#e2e8f0' }]} />
              )}
            </View>
            <View style={styles.stopBody}>
              <Text style={styles.stopName}>
                {s.stopName} {s.passed ? '· passed' : ''}
              </Text>
              <Text style={styles.stopTime}>
                {s.time}
                {s.students.length > 0 ? ` · ${s.students.length} student(s): ${s.students.join(', ')}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
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
    marginBottom: 10,
  },
  routeName: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  routeMeta: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
  },
  heroProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  busCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  busIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  busBody: { flex: 1, marginRight: 8 },
  busReg: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  busMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  busChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  busChipText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  formTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 8,
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
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  stopRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  stopRail: {
    alignItems: 'center',
    marginRight: 12,
  },
  stopDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopLine: {
    width: 2,
    flex: 1,
    minHeight: 26,
    marginVertical: 2,
  },
  stopBody: {
    flex: 1,
    paddingBottom: 16,
  },
  stopName: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  stopTime: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
