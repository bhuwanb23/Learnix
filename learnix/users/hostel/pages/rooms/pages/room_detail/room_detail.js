import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const roomInfo = {
  A: {
    block: 'Block A',
    type: 'Girls Hostel',
    color: '#2563eb',
    residents: [
      { id: '1', name: 'Sneha Reddy', roll: '21CS118', branch: 'CSE', year: '3rd', bed: 'A-101-1' },
      { id: '2', name: 'Priya Sharma', roll: '21EC042', branch: 'ECE', year: '3rd', bed: 'A-101-2' },
      { id: '3', name: 'Ananya Iyer', roll: '21ME077', branch: 'ME', year: '3rd', bed: 'A-101-3' },
    ],
  },
  B: {
    block: 'Block B',
    type: 'Boys Hostel',
    color: '#0891b2',
    residents: [
      { id: '1', name: 'Arjun Mehta', roll: '22CS045', branch: 'CSE', year: '2nd', bed: 'B-204-1' },
      { id: '2', name: 'Rahul Verma', roll: '22IT031', branch: 'IT', year: '2nd', bed: 'B-204-2' },
    ],
  },
  C: {
    block: 'Block C',
    type: 'Boys Hostel',
    color: '#059669',
    residents: [
      { id: '1', name: 'Karan Singh', roll: '20CS098', branch: 'CSE', year: '4th', bed: 'C-302-1' },
    ],
  },
};

export default function RoomDetail({ roomId, block, onBack }) {
  const [residents, setResidents] = useState(
    roomInfo[block.charAt(0)]?.residents || roomInfo.A.residents
  );
  const [showForm, setShowForm] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentBranch, setStudentBranch] = useState('CSE');
  const [studentYear, setStudentYear] = useState('1st');

  const info = roomInfo[block.charAt(0)] || roomInfo.A;
  const capacity = 3;
  const occupied = residents.length;

  const handleAllocate = () => {
    if (!studentName.trim() || !studentRoll.trim()) {
      Alert.alert('Incomplete', 'Enter the student name and roll number.');
      return;
    }
    setResidents([
      ...residents,
      {
        id: String(Date.now()),
        name: studentName.trim(),
        roll: studentRoll.trim().toUpperCase(),
        branch: studentBranch,
        year: studentYear,
        bed: `${roomId}-${residents.length + 1}`,
      },
    ]);
    setStudentName('');
    setStudentRoll('');
    setShowForm(false);
    Alert.alert('Allocated', `${studentName.trim()} allotted bed ${roomId}-${residents.length + 1}.`);
  };

  const handleVacate = (resident) => {
    Alert.alert('Vacate Room', `Remove ${resident.name} from ${roomId}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Vacate',
        style: 'destructive',
        onPress: () => setResidents(residents.filter((r) => r.id !== resident.id)),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.roomId}>{roomId}</Text>
          <Text style={styles.roomSub}>
            {info.block} · {info.type} · {occupied}/{capacity} beds occupied
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{capacity - occupied}</Text>
              <Text style={styles.heroStatLabel}>Beds Free</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{occupied}</Text>
              <Text style={styles.heroStatLabel}>Residents</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>₹6,000</Text>
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
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={() => Alert.alert('Transfer', 'Pick a target room to transfer a resident.')}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionSecondaryText}>Transfer</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Allocate a bed in {roomId}</Text>
            <Text style={styles.formLabel}>Student Name</Text>
            <TextInput style={styles.input} placeholder="Full name" value={studentName} onChangeText={setStudentName} placeholderTextColor="#9ca3af" />
            <Text style={styles.formLabel}>Roll Number</Text>
            <TextInput style={styles.input} placeholder="e.g. 22CS045" value={studentRoll} onChangeText={setStudentRoll} placeholderTextColor="#9ca3af" />
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Branch</Text>
                <View style={styles.pickerRow}>
                  {['CSE', 'IT', 'ECE', 'ME'].map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.pickerChip, studentBranch === b && styles.pickerChipActive]}
                      onPress={() => setStudentBranch(b)}
                    >
                      <Text style={[styles.pickerText, studentBranch === b && styles.pickerTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Year</Text>
                <View style={styles.pickerRow}>
                  {['1st', '2nd', '3rd', '4th'].map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.pickerChip, studentYear === y && styles.pickerChipActive]}
                      onPress={() => setStudentYear(y)}
                    >
                      <Text style={[styles.pickerText, studentYear === y && styles.pickerTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleAllocate}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.confirmText}>Confirm Allocation</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Residents</Text>
        {residents.map((r) => (
          <View key={r.id} style={styles.residentCard}>
            <View style={[styles.avatar, { backgroundColor: info.color + '1a' }]}>
              <Text style={[styles.avatarText, { color: info.color }]}>{r.name.charAt(0)}</Text>
            </View>
            <View style={styles.residentBody}>
              <Text style={styles.residentName}>{r.name}</Text>
              <Text style={styles.residentMeta}>
                {r.roll} · {r.branch} · {r.year} yr
              </Text>
              <Text style={styles.bedChip}>Bed {r.bed}</Text>
            </View>
            <TouchableOpacity
              style={styles.vacateBtn}
              onPress={() => handleVacate(r)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.vacateText}>Vacate</Text>
            </TouchableOpacity>
          </View>
        ))}
        {residents.length === 0 && (
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
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  roomSub: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 6,
  },
  actionSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionSecondaryText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.primary,
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
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
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
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.text,
  },
  formRow: { flexDirection: 'row', justifyContent: 'space-between' },
  formHalf: { flex: 1, marginRight: 8 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap' },
  pickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 6,
    marginBottom: 6,
  },
  pickerChipActive: { backgroundColor: theme.colors.primary },
  pickerText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  pickerTextActive: { color: '#fff' },
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
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
  },
  residentBody: { flex: 1 },
  residentName: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  residentMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_600SemiBold',
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
    fontFamily: 'Manrope_700Bold',
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
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 8,
  },
});