import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const venues = [
  { id: 'V1', name: 'Main Ground', capacity: 2000, type: 'Outdoor', status: 'Booked', today: 'Cricket Cup — 9 AM', color: '#059669' },
  { id: 'V2', name: 'Indoor Court', capacity: 400, type: 'Indoor', status: 'Available', today: 'Free', color: '#2563eb' },
  { id: 'V3', name: 'Open Air Theatre', capacity: 800, type: 'Outdoor', status: 'Booked', today: 'Dance rehearsal — 5:30 PM', color: '#d97706' },
  { id: 'V4', name: 'Main Auditorium', capacity: 1200, type: 'Indoor', status: 'Booked', today: 'Tech Fest setup', color: '#dc2626' },
  { id: 'V5', name: 'Football Field', capacity: 1500, type: 'Outdoor', status: 'Booked', today: 'Friendly vs NIT — 6:30 PM', color: '#0891b2' },
  { id: 'V6', name: 'Seminar Hall B', capacity: 150, type: 'Indoor', status: 'Available', today: 'Free', color: '#2563eb' },
];

const bookingRequests = [
  { id: '1', venue: 'Main Auditorium', by: 'Tech Fest Committee', date: 'Nov 21-22', purpose: 'Tech Fest 2026', time: '9 AM - 6 PM', status: 'Pending' },
  { id: '2', venue: 'Open Air Theatre', by: 'Cultural Committee', date: 'Dec 5', purpose: 'Cultural Night 2026', time: '6 PM - 10 PM', status: 'Pending' },
];

export default function VenuesModule({ navigation }) {
  const [requests, setRequests] = useState(bookingRequests);

  const handleRequest = (id, action) => {
    setRequests(
      requests.map((r) => (r.id === id ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' } : r))
    );
    if (action === 'approve') {
      Alert.alert('Approved', 'Venue booking confirmed. Calendar updated.');
    } else {
      Alert.alert('Rejected', 'Booking request rejected. Committee notified.');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>14</Text>
          <Text style={styles.statLabel}>Venues</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>6</Text>
          <Text style={styles.statLabel}>Booked Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>Pending Req.</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Booking Requests</Text>
      </View>
      {requests.map((r) => (
        <View key={r.id} style={styles.requestCard}>
          <View style={styles.requestTop}>
            <View style={styles.requestIcon}>
              <Ionicons name="calendar-outline" size={16} color="#d97706" />
            </View>
            <View style={styles.requestBody}>
              <Text style={styles.requestVenue}>{r.venue}</Text>
              <Text style={styles.requestMeta}>
                {r.by} · {r.purpose}
              </Text>
              <Text style={styles.requestMeta}>
                {r.date} · {r.time}
              </Text>
            </View>
            {r.status === 'Pending' ? (
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleRequest(r.id, 'reject')}
                >
                  <Ionicons name="close-outline" size={14} color="#dc2626" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleRequest(r.id, 'approve')}
                >
                  <Ionicons name="checkmark-outline" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.reqStatusChip,
                  { backgroundColor: r.status === 'Approved' ? '#dcfce7' : '#fee2e2' },
                ]}
              >
                <Text
                  style={[
                    styles.reqStatusText,
                    { color: r.status === 'Approved' ? '#059669' : '#dc2626' },
                  ]}
                >
                  {r.status}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Venue Availability — Today</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Book Venue', 'Venue booking form opens here — date, time and purpose.')}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>Book</Text>
        </TouchableOpacity>
      </View>

      {venues.map((v) => (
        <View key={v.id} style={styles.card}>
          <View style={[styles.venueIcon, { backgroundColor: v.color + '1a' }]}>
            <Ionicons name="location-outline" size={17} color={v.color} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.venueName}>{v.name}</Text>
            <Text style={styles.venueMeta}>
              {v.type} · Capacity {v.capacity}
            </Text>
            <Text style={styles.venueToday}>{v.today}</Text>
          </View>
          <View
            style={[
              styles.availChip,
              { backgroundColor: v.status === 'Available' ? '#dcfce7' : '#fee2e2' },
            ]}
          >
            <Text
              style={[
                styles.availText,
                { color: v.status === 'Available' ? '#059669' : '#dc2626' },
              ]}
            >
              {v.status}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
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
  reqStatusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reqStatusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
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
  venueToday: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    marginTop: 4,
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
});