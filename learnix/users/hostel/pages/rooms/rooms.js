import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import RoomDetail from './pages/room_detail/room_detail';

const blocks = [
  {
    id: 'A',
    name: 'Block A',
    type: 'Girls Hostel',
    floors: 4,
    capacity: 440,
    occupied: 412,
    color: '#2563eb',
    rooms: [
      { id: 'A-101', capacity: 3, occupied: 3, status: 'Full' },
      { id: 'A-102', capacity: 3, occupied: 2, status: 'Partial' },
      { id: 'A-103', capacity: 3, occupied: 0, status: 'Vacant' },
      { id: 'A-104', capacity: 3, occupied: 3, status: 'Full' },
      { id: 'A-105', capacity: 3, occupied: 1, status: 'Partial' },
      { id: 'A-106', capacity: 3, occupied: 3, status: 'Full' },
    ],
  },
  {
    id: 'B',
    name: 'Block B',
    type: 'Boys Hostel',
    floors: 4,
    capacity: 480,
    occupied: 458,
    color: '#0891b2',
    rooms: [
      { id: 'B-201', capacity: 3, occupied: 3, status: 'Full' },
      { id: 'B-202', capacity: 3, occupied: 2, status: 'Partial' },
      { id: 'B-203', capacity: 3, occupied: 3, status: 'Full' },
      { id: 'B-204', capacity: 3, occupied: 2, status: 'Partial' },
      { id: 'B-205', capacity: 3, occupied: 0, status: 'Vacant' },
      { id: 'B-206', capacity: 3, occupied: 3, status: 'Full' },
    ],
  },
  {
    id: 'C',
    name: 'Block C',
    type: 'Boys Hostel',
    floors: 3,
    capacity: 400,
    occupied: 378,
    color: '#059669',
    rooms: [
      { id: 'C-301', capacity: 3, occupied: 3, status: 'Full' },
      { id: 'C-302', capacity: 3, occupied: 1, status: 'Partial' },
      { id: 'C-303', capacity: 3, occupied: 3, status: 'Full' },
      { id: 'C-304', capacity: 3, occupied: 0, status: 'Vacant' },
      { id: 'C-305', capacity: 3, occupied: 2, status: 'Partial' },
      { id: 'C-306', capacity: 3, occupied: 3, status: 'Full' },
    ],
  },
];

export default function RoomsModule({ navigation }) {
  const [selectedBlock, setSelectedBlock] = useState('A');
  const [selectedRoom, setSelectedRoom] = useState(null);

  if (selectedRoom) {
    return (
      <RoomDetail
        roomId={selectedRoom.id}
        block={selectedRoom.block}
        onBack={() => setSelectedRoom(null)}
      />
    );
  }

  const block = blocks.find((b) => b.id === selectedBlock);
  const pct = Math.round((block.occupied / block.capacity) * 100);

  const getStatusStyle = (status) => {
    if (status === 'Full') return { bg: '#fee2e2', color: '#dc2626' };
    if (status === 'Partial') return { bg: '#fef3c7', color: '#d97706' };
    return { bg: '#dcfce7', color: '#059669' };
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1,248</Text>
          <Text style={styles.statLabel}>Occupied Beds</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>72</Text>
          <Text style={styles.statLabel}>Vacant Beds</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>6</Text>
          <Text style={styles.statLabel}>Full Blocks</Text>
        </View>
      </View>

      <View style={styles.blockTabs}>
        {blocks.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.blockTab, selectedBlock === b.id && styles.blockTabActive]}
            onPress={() => setSelectedBlock(b.id)}
          >
            <Text style={[styles.blockTabText, selectedBlock === b.id && styles.blockTabTextActive]}>
              {b.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.blockCard}>
        <View style={styles.blockHeader}>
          <View>
            <Text style={styles.blockName}>{block.name} · {block.type}</Text>
            <Text style={styles.blockSub}>
              {block.occupied} of {block.capacity} beds · {block.floors} floors
            </Text>
          </View>
          <View style={[styles.pctChip, { backgroundColor: block.color + '1a' }]}>
            <Text style={[styles.pctText, { color: block.color }]}>{pct}%</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: pct + '%', backgroundColor: block.color }]} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rooms — Floor {selectedBlock}1–{selectedBlock}6</Text>
        <TouchableOpacity
          style={styles.allocateBtn}
          onPress={() =>
            Alert.alert('Allocate Room', 'Student search opens here — pick a student and an available bed.')
          }
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.allocateText}>Allocate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.roomGrid}>
        {block.rooms.map((room) => {
          const st = getStatusStyle(room.status);
          return (
            <TouchableOpacity
              key={room.id}
              style={styles.roomCard}
              onPress={() => setSelectedRoom({ id: room.id, block: block.id })}
            >
              <View style={styles.roomTop}>
                <Text style={styles.roomId}>{room.id}</Text>
                <View style={[styles.roomStatus, { backgroundColor: st.bg }]}>
                  <Text style={[styles.roomStatusText, { color: st.color }]}>{room.status}</Text>
                </View>
              </View>
              <View style={styles.bedRow}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.bed,
                      i < room.occupied ? { backgroundColor: block.color } : styles.bedEmpty,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.roomMeta}>
                {room.occupied}/{room.capacity} beds
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    fontFamily: 'Manrope_800ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  blockTabs: {
    flexDirection: 'row',
    marginTop: 16,
  },
  blockTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  blockTabActive: { backgroundColor: theme.colors.primary },
  blockTabText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  blockTabTextActive: { color: '#fff' },
  blockCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockName: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  blockSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pctChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pctText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  allocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  allocateText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 2,
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  roomCard: {
    width: '31.5%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 10,
  },
  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomId: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  roomStatus: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  roomStatusText: { fontSize: 8, fontFamily: 'Manrope_700Bold' },
  bedRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  bed: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    marginHorizontal: 1.5,
  },
  bedEmpty: { backgroundColor: '#e5e7eb' },
  roomMeta: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 6,
  },
});