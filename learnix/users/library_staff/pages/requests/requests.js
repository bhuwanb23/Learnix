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

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const INITIAL_REQUESTS = [
  { id: 'R1', student: 'Isha Gupta', rollNo: 'ECE-23-019', book: 'Signals & Systems', reason: 'Course reference', requestedAt: '2 hrs ago', status: 'Pending', color: '#059669' },
  { id: 'R2', student: 'Kabir Joshi', rollNo: 'CSE-24-001', book: 'Python Crash Course', reason: 'Self-study', requestedAt: '5 hrs ago', status: 'Pending', color: '#2563eb' },
  { id: 'R3', student: 'Meghna Das', rollNo: 'BBA-23-008', book: 'Marketing Analytics', reason: 'Project research', requestedAt: 'Yesterday', status: 'Pending', color: '#d97706' },
  { id: 'R4', student: 'Rohan Verma', rollNo: 'CSE-22-008', book: 'Machine Learning Yearning', reason: 'Seminar preparation', requestedAt: 'Yesterday', status: 'Approved', color: '#059669' },
  { id: 'R5', student: 'Sneha Patel', rollNo: 'BBA-23-002', book: 'Consumer Behaviour', reason: 'Assignment', requestedAt: '2 days ago', status: 'Rejected', color: '#dc2626' },
];

const STATUS_COLORS = {
  Pending: '#d97706',
  Approved: '#059669',
  Rejected: '#dc2626',
};

export default function RequestsModule({ navigation }) {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);

  const handleAction = (request, action) => {
    if (action === 'approve') {
      Alert.alert(
        'Approve Request',
        `Reserve "${request.book}" for ${request.student}? They will be notified to collect it.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: () => {
              setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: 'Approved' } : r)));
              Alert.alert('Approved', `${request.book} reserved for ${request.student}.`);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Reject Request',
        `Reject "${request.book}" request from ${request.student}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: () => {
              setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: 'Rejected' } : r)));
              Alert.alert('Rejected', `${request.student} notified.`);
            },
          },
        ]
      );
    }
  };

  const handleAddToCatalog = () => {
    Alert.alert(
      'Request New Book',
      'Submit a purchase request for a book not in the catalog?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => Alert.alert('Submitted', 'Purchase request sent to the library head for approval.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#d9770614' }]}>
            <Ionicons name="cart" size={18} color="#d97706" />
          </View>
          <Text style={styles.statValue}>{requests.filter((r) => r.status === 'Pending').length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#05966914' }]}>
            <Ionicons name="checkmark-done" size={18} color="#059669" />
          </View>
          <Text style={styles.statValue}>{requests.filter((r) => r.status === 'Approved').length}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#2563eb14' }]}>
            <Ionicons name="people" size={18} color="#2563eb" />
          </View>
          <Text style={styles.statValue}>{requests.length}</Text>
          <Text style={styles.statLabel}>Total Requests</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleAddToCatalog} activeOpacity={0.85}>
        <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
        <Text style={styles.addBtnText}>Request New Book Purchase</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Student Requests</Text>
      {requests.map((request) => (
        <View key={request.id} style={styles.requestCard}>
          <View style={[styles.requestIcon, { backgroundColor: STATUS_COLORS[request.status] + '14' }]}>
            <Ionicons name="cart-outline" size={18} color={STATUS_COLORS[request.status]} />
          </View>
          <View style={styles.info}>
            <Text style={styles.bookTitle}>{request.book}</Text>
            <Text style={styles.meta}>{request.student} • {request.rollNo} • {request.requestedAt}</Text>
            <Text style={styles.reason}>"{request.reason}"</Text>
            <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[request.status] + '1A' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[request.status] }]}>{request.status}</Text>
            </View>
          </View>
          {request.status === 'Pending' ? (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(request, 'approve')} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={16} color="#059669" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(request, 'reject')} activeOpacity={0.8}>
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
    marginBottom: 16,
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
  addBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  meta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  reason: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
  },
});