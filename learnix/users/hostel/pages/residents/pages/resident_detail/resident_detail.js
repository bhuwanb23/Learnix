import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const blockColors = { A: '#2563eb', B: '#0891b2', C: '#059669' };

const history = [
  { date: '05 Sep 2026', item: 'Hostel rent — August', amount: '₹6,000', status: 'Paid' },
  { date: '05 Aug 2026', item: 'Hostel rent — July', amount: '₹6,000', status: 'Paid' },
  { date: '05 Jul 2026', item: 'Hostel rent — June', amount: '₹6,000', status: 'Paid' },
];

export default function ResidentDetail({ resident, onBack }) {
  const [dues, setDues] = useState(resident.dues);
  const color = blockColors[resident.block];

  const handleMessage = () => {
    Alert.alert('Message', `Opening chat with ${resident.name}...`);
  };

  const handleTransfer = () => {
    Alert.alert('Transfer Room', 'Pick a target room in the room picker to move this resident.');
  };

  const handleVacate = () => {
    Alert.alert('Vacate Room', `Remove ${resident.name} from ${resident.room}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Vacate', style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{resident.name.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{resident.name}</Text>
          <Text style={styles.meta}>
            {resident.roll} · {resident.branch} · {resident.year} Year
          </Text>
          <View style={styles.roomBadge}>
            <Ionicons name="bed-outline" size={13} color="#fff" />
            <Text style={styles.roomBadgeText}>
              {resident.room} · Bed {resident.bed} · Block {resident.block}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleTransfer}>
            <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleVacate}>
            <Ionicons name="log-out-outline" size={16} color="#dc2626" />
            <Text style={[styles.actionText, { color: '#dc2626' }]}>Vacate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resident Details</Text>
          <View style={styles.infoCard}>
            {[
              { label: 'Phone', value: resident.phone },
              { label: 'Joined', value: resident.joined },
              { label: 'Guardian', value: `${resident.name.split(' ')[0]} family` },
            ].map((row, idx) => (
              <View key={row.label}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
                {idx < 2 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentTop}>
              <View>
                <Text style={styles.paymentLabel}>Outstanding Dues</Text>
                <Text style={[styles.paymentValue, { color: dues === '₹0' ? '#059669' : '#dc2626' }]}>
                  {dues}
                </Text>
              </View>
              {dues !== '₹0' ? (
                <TouchableOpacity
                  style={styles.receiveBtn}
                  onPress={() => {
                    setDues('₹0');
                    Alert.alert('Payment Received', `${resident.name}'s dues cleared.`);
                  }}
                >
                  <Ionicons name="cash-outline" size={14} color="#fff" />
                  <Text style={styles.receiveText}>Mark Paid</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.clearChip}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                  <Text style={styles.clearText}>Clear</Text>
                </View>
              )}
            </View>
            <View style={styles.divider} />
            {history.map((h) => (
              <View key={h.date} style={styles.historyRow}>
                <View style={styles.historyBody}>
                  <Text style={styles.historyItem}>{h.item}</Text>
                  <Text style={styles.historyDate}>{h.date}</Text>
                </View>
                <Text style={styles.historyAmount}>{h.amount}</Text>
                <View style={styles.paidChip}>
                  <Text style={styles.paidText}>{h.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Complaints</Text>
          <View style={styles.complaintCard}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
            <View style={styles.complaintBody}>
              <Text style={styles.complaintTitle}>Wi-Fi router replaced — resolved</Text>
              <Text style={styles.complaintMeta}>Aug 20 · Network</Text>
            </View>
          </View>
          <View style={styles.complaintCard}>
            <Ionicons name="time-outline" size={16} color="#d97706" />
            <View style={styles.complaintBody}>
              <Text style={styles.complaintTitle}>Washbasin leak in bathroom</Text>
              <Text style={styles.complaintMeta}>Sep 3 · Plumbing · In progress</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  roomBadgeText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 5,
  },
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
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 5,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  paymentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  paymentValue: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    marginTop: 2,
  },
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  receiveText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 5,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
    marginLeft: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyBody: { flex: 1 },
  historyItem: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  historyDate: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  historyAmount: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginRight: 8,
  },
  paidChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  paidText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
  },
  complaintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  complaintBody: { flex: 1, marginLeft: 10 },
  complaintTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  complaintMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});