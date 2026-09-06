import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { sportsApi } from '../../../../../../services/api';

const fmtRange = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return s.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${s.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
};

const STATUS_LABEL = {
  PENDING: { label: 'Pending', bg: '#fef3c7', color: '#d97706' },
  APPROVED: { label: 'Approved', bg: '#dcfce7', color: '#059669' },
  CONFIRMED: { label: 'Confirmed', bg: '#dcfce7', color: '#059669' },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', color: '#dc2626' },
  DECLINED: { label: 'Declined', bg: '#fee2e2', color: '#dc2626' },
};

export default function EventDetail({ eventId, onBack }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVolunteer, setShowVolunteer] = useState(false);
  const [volunteerRoll, setVolunteerRoll] = useState('');
  const [volunteerRole, setVolunteerRole] = useState('');
  const [newItem, setNewItem] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await sportsApi.eventDetail(eventId);
      setEvent(data);
    } catch (e) {
      setError(e.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const decide = async (regId, decision) => {
    try {
      await sportsApi.decideRegistration(regId, decision);
      setEvent((prev) => ({
        ...prev,
        pendingCount: prev.pendingCount - 1,
        registrationList: prev.registrationList.map((r) =>
          r.id === regId ? { ...r, status: decision } : r
        ),
      }));
      Alert.alert(
        decision === 'APPROVED' ? 'Approved' : 'Rejected',
        decision === 'APPROVED'
          ? 'Registration confirmed. The student was notified.'
          : 'Registration rejected. The student was notified.'
      );
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const announce = async () => {
    try {
      const res = await sportsApi.announceEvent(eventId);
      Alert.alert('Announced', `Pushed to ${res.recipients} students.`);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const addScheduleItem = async () => {
    if (!newItem.trim()) return;
    try {
      const nextDay = event.schedule.length > 0 ? event.schedule[event.schedule.length - 1].day : 1;
      const item = await sportsApi.addScheduleItem(eventId, nextDay, newItem.trim());
      setEvent((prev) => ({ ...prev, schedule: [...prev.schedule, item] }));
      setNewItem('');
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const toggleItem = async (itemId, isDone) => {
    setEvent((prev) => ({
      ...prev,
      schedule: prev.schedule.map((s) => (s.id === itemId ? { ...s, isDone } : s)),
    }));
    try {
      await sportsApi.toggleScheduleItem(itemId, isDone);
    } catch (e) {
      Alert.alert('Update failed', e.message);
      load();
    }
  };

  const addVolunteer = async () => {
    if (!volunteerRoll.trim()) {
      Alert.alert('Missing roll no', 'Enter the student roll number to add a volunteer.');
      return;
    }
    try {
      const vol = await sportsApi.addVolunteer(eventId, volunteerRoll.trim(), volunteerRole.trim() || undefined);
      setEvent((prev) => ({ ...prev, volunteers: [...prev.volunteers, vol] }));
      Alert.alert('Volunteer added', `${vol.name} was assigned and notified.`);
      setVolunteerRoll('');
      setVolunteerRole('');
      setShowVolunteer(false);
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

  if (error || !event) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Event not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pending = event.pendingCount;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          <Text style={styles.eventName}>{event.title}</Text>
          <Text style={styles.eventMeta}>
            {fmtRange(event.startDate, event.endDate)} · {event.venue || 'TBD'}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{event.registrations}</Text>
              <Text style={styles.heroStatLabel}>Registered</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{pending}</Text>
              <Text style={styles.heroStatLabel}>Pending</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{event.capacity}</Text>
              <Text style={styles.heroStatLabel}>Capacity</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={announce}>
            <Ionicons name="megaphone-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Announce</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowVolunteer(!showVolunteer)}
          >
            <Ionicons name="people-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{showVolunteer ? 'Cancel' : 'Volunteers'}</Text>
          </TouchableOpacity>
        </View>

        {showVolunteer && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Student roll no</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CSE-23-014"
              placeholderTextColor="#9ca3af"
              value={volunteerRoll}
              onChangeText={setVolunteerRoll}
            />
            <Text style={styles.formLabel}>Role (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Registration desk"
              placeholderTextColor="#9ca3af"
              value={volunteerRole}
              onChangeText={setVolunteerRole}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={addVolunteer}>
              <Ionicons name="person-add" size={15} color="#fff" />
              <Text style={styles.confirmText}>Assign Volunteer</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>Schedule</Text>
          {event.schedule.length === 0 && (
            <Text style={styles.scheduleEmpty}>No schedule items yet — add the first one below.</Text>
          )}
          {event.schedule.map((s) => (
            <TouchableOpacity key={s.id} style={styles.scheduleRow} onPress={() => toggleItem(s.id, !s.isDone)}>
              <View
                style={[
                  styles.scheduleDot,
                  { backgroundColor: s.isDone ? '#059669' : '#fef3c7' },
                ]}
              >
                {s.isDone && <Ionicons name="checkmark" size={9} color="#fff" />}
              </View>
              <View style={styles.scheduleBody}>
                <Text style={styles.scheduleItem}>{s.item}</Text>
                <Text style={styles.scheduleTime}>Day {s.day}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.scheduleAddRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Add schedule item…"
              placeholderTextColor="#9ca3af"
              value={newItem}
              onChangeText={setNewItem}
            />
            <TouchableOpacity style={styles.scheduleAddBtn} onPress={addScheduleItem}>
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registrations</Text>
          <Text style={styles.sectionCount}>{pending} pending</Text>
        </View>

        {event.registrationList.length === 0 && (
          <Text style={styles.empty}>No registrations yet.</Text>
        )}
        {event.registrationList.map((r) => {
          const st = STATUS_LABEL[r.status] || STATUS_LABEL.PENDING;
          return (
            <View key={r.id} style={styles.regCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{r.name.charAt(0)}</Text>
              </View>
              <View style={styles.regBody}>
                <Text style={styles.regName}>{r.name}</Text>
                <Text style={styles.regEvent}>{new Date(r.at).toLocaleDateString()}</Text>
              </View>
              {r.status === 'PENDING' ? (
                <View style={styles.regActions}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => decide(r.id, 'REJECTED')}
                  >
                    <Ionicons name="close-outline" size={14} color="#dc2626" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => decide(r.id, 'APPROVED')}
                  >
                    <Ionicons name="checkmark-outline" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.approvedChip, { backgroundColor: st.bg }]}>
                  <Text style={[styles.approvedText, { color: st.color }]}>{st.label}</Text>
                </View>
              )}
            </View>
          );
        })}
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
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
  },
  eventName: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 8,
  },
  eventMeta: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 12,
  },
  confirmText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 5,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  scheduleTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 6,
  },
  scheduleEmpty: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    paddingVertical: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scheduleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scheduleBody: { flex: 1 },
  scheduleItem: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  scheduleTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  scheduleAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  scheduleAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#d97706',
  },
  empty: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  regCard: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  regBody: { flex: 1, marginRight: 8 },
  regName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  regEvent: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  regActions: {
    flexDirection: 'row',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  approveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  approvedText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});
