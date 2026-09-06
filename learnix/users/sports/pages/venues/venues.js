import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { sportsApi } from '../../../../services/api';

const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

export default function VenuesModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [bookForm, setBookForm] = useState({ venueName: '', eventTitle: '', date: '', timeSlot: '' });

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const d = await sportsApi.venues();
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load venues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const decide = async (bookingId, decision, eventTitle) => {
    try {
      await sportsApi.decideVenueBooking(bookingId, decision);
      Alert.alert(
        decision === 'APPROVED' ? 'Approved' : 'Rejected',
        decision === 'APPROVED'
          ? `"${eventTitle}" booking confirmed. Calendar updated.`
          : `"${eventTitle}" booking rejected.`
      );
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const book = async () => {
    const venue = (data?.venues || []).find((v) =>
      v.name.toLowerCase().includes(bookForm.venueName.toLowerCase().trim())
    );
    if (!venue) {
      Alert.alert('Venue not found', `Available: ${(data?.venues || []).map((v) => v.name).join(', ')}`);
      return;
    }
    if (!bookForm.eventTitle.trim() || !bookForm.date.trim() || !bookForm.timeSlot.trim()) {
      Alert.alert('Incomplete', 'Fill event title, date (YYYY-MM-DD) and time slot (e.g. 15:00-18:00).');
      return;
    }
    try {
      const res = await sportsApi.bookVenue({
        venueId: venue.id,
        eventTitle: bookForm.eventTitle.trim(),
        date: bookForm.date.trim(),
        timeSlot: bookForm.timeSlot.trim(),
      });
      Alert.alert('Requested', `${res.venue} booking for "${bookForm.eventTitle}" is now pending approval.`);
      setShowBook(false);
      setBookForm({ venueName: '', eventTitle: '', date: '', timeSlot: '' });
      load(false);
    } catch (e) {
      Alert.alert('Booking failed', e.message);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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

  const { stats, bookings, venues } = data;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.venues}</Text>
          <Text style={styles.statLabel}>Venues</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{venues.filter((v) => v.status === 'BOOKED').length}</Text>
          <Text style={styles.statLabel}>Booked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending Req.</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Booking Requests</Text>
      </View>
      {bookings.length === 0 && (
        <Text style={styles.empty}>No pending booking requests.</Text>
      )}
      {bookings.map((r) => (
        <View key={r.id} style={styles.requestCard}>
          <View style={styles.requestTop}>
            <View style={styles.requestIcon}>
              <Ionicons name="calendar-outline" size={16} color="#d97706" />
            </View>
            <View style={styles.requestBody}>
              <Text style={styles.requestVenue}>{r.venue}</Text>
              <Text style={styles.requestMeta}>{r.eventTitle}</Text>
              <Text style={styles.requestMeta}>
                {fmtDate(r.date)} · {r.timeSlot}
              </Text>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => decide(r.id, 'REJECTED', r.eventTitle)}
              >
                <Ionicons name="close-outline" size={14} color="#dc2626" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => decide(r.id, 'APPROVED', r.eventTitle)}
              >
                <Ionicons name="checkmark-outline" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Venue Availability</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowBook(true)}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>Book</Text>
        </TouchableOpacity>
      </View>

      {venues.map((v) => (
        <View key={v.id} style={styles.card}>
          <View style={[styles.venueIcon, { backgroundColor: v.status === 'AVAILABLE' ? '#dcfce7' : '#fee2e2' }]}>
            <Ionicons name="location-outline" size={17} color={v.status === 'AVAILABLE' ? '#059669' : '#dc2626'} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.venueName}>{v.name}</Text>
            <Text style={styles.venueMeta}>
              {v.location || 'On campus'} · Capacity {v.capacity}
            </Text>
            {v.pendingRequests > 0 && (
              <Text style={styles.venuePending}>{v.pendingRequests} pending request(s)</Text>
            )}
          </View>
          <View
            style={[
              styles.availChip,
              { backgroundColor: v.status === 'AVAILABLE' ? '#dcfce7' : v.status === 'BOOKED' ? '#fee2e2' : '#fef3c7' },
            ]}
          >
            <Text style={styles.availText}>{v.status}</Text>
          </View>
        </View>
      ))}

      {/* Book venue modal */}
      <Modal visible={showBook} transparent animationType="fade" onRequestClose={() => setShowBook(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Book a Venue</Text>
            <Text style={styles.modalSub}>Creates a PENDING request — conflicts are rejected automatically.</Text>
            <TextInput
              style={styles.input}
              placeholder="Venue name (partial ok)"
              placeholderTextColor="#9ca3af"
              value={bookForm.venueName}
              onChangeText={(v) => setBookForm({ ...bookForm, venueName: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Event title"
              placeholderTextColor="#9ca3af"
              value={bookForm.eventTitle}
              onChangeText={(v) => setBookForm({ ...bookForm, eventTitle: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#9ca3af"
              value={bookForm.date}
              onChangeText={(v) => setBookForm({ ...bookForm, date: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Time slot (e.g. 15:00-18:00)"
              placeholderTextColor="#9ca3af"
              value={bookForm.timeSlot}
              onChangeText={(v) => setBookForm({ ...bookForm, timeSlot: v })}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowBook(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={book}>
                <Text style={styles.modalSaveText}>Request Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4, marginBottom: 8 },
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  requestBody: { flex: 1, marginRight: 8 },
  requestVenue: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  requestMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  requestActions: {
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  venueIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  venueName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  venueMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  venuePending: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: '#d97706',
    marginTop: 3,
  },
  availChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
    marginBottom: 10,
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
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  modalSave: { backgroundColor: theme.colors.primary },
  modalSaveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  modalCancel: { backgroundColor: theme.colors.surfaceMuted },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
});
