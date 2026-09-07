import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { api } from '../../../../services/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 7pm

export default function TimetableScreen({ navigation }) {
  const [data, setData] = useState({ slots: [], conflicts: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Mon');

  const fetchData = useCallback(async () => {
    try {
      const d = await api.adminApi.timetable();
      setData({ slots: d.slots || [], conflicts: d.conflicts || [] });
    } catch (e) {
      console.warn('Failed to load timetable:', e);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const daySlots = data.slots.filter(s => s.day === selectedDay);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Day tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
        {DAYS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.dayTab, selectedDay === d && styles.dayTabActive]}
            onPress={() => setSelectedDay(d)}
          >
            <Text style={[styles.dayTabText, selectedDay === d && styles.dayTabTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {data.conflicts.length > 0 && (
        <View style={styles.conflictBanner}>
          <Ionicons name="warning" size={14} color="#dc2626" />
          <Text style={styles.conflictText}>{data.conflicts.length} scheduling conflict(s) detected</Text>
        </View>
      )}

      <ScrollView
        style={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {HOURS.map(hour => {
          const slot = daySlots.find(s => {
            const startH = new Date(`2000-01-01T${s.startTime}`).getHours();
            return startH === hour;
          });
          return (
            <View key={hour} style={styles.timeRow}>
              <View style={styles.timeLabel}>
                <Text style={styles.timeLabelText}>{`${hour}:00`}</Text>
              </View>
              <View style={styles.timeSlot}>
                {slot ? (
                  <View style={[styles.slotCard, { backgroundColor: slot.color || '#dbeafe' }]}>
                    <Text style={styles.slotCourse}>{slot.courseName || slot.offering?.course?.name || 'Course'}</Text>
                    <Text style={styles.slotTeacher}>{slot.teacherName || slot.offering?.teacher?.name || ''}</Text>
                    <Text style={styles.slotRoom}>{slot.room || slot.roomNumber || ''}</Text>
                  </View>
                ) : (
                  <View style={styles.emptySlot} />
                )}
              </View>
            </View>
          );
        })}

        {daySlots.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No classes scheduled for {selectedDay}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  dayTabs: { flexDirection: 'row', padding: 12, gap: 8 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  dayTabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayTabText: { fontSize: 13, color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  dayTabTextActive: { color: '#fff' },
  conflictBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', marginHorizontal: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 8 },
  conflictText: { fontSize: 12, color: '#dc2626', fontFamily: 'Manrope-SemiBold' },
  grid: { flex: 1, paddingHorizontal: 12 },
  timeRow: { flexDirection: 'row', marginBottom: 6 },
  timeLabel: { width: 50, justifyContent: 'flex-start', paddingTop: 4 },
  timeLabelText: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  timeSlot: { flex: 1 },
  slotCard: { borderRadius: 12, padding: 10, marginLeft: 8 },
  slotCourse: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  slotTeacher: { fontSize: 10, color: '#475569', fontFamily: 'Manrope-Regular', marginTop: 2 },
  slotRoom: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  emptySlot: { height: 36, marginLeft: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10 },
});
