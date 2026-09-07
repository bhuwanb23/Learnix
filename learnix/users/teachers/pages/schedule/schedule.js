import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { api } from '../../../../services/api';

const DAY_IDS = ['1', '2', '3', '4', '5', '6', '0'];

export default function SchedulePage({ navigation }) {
  const [scheduleData, setScheduleData] = useState({ days: [] });
  const [activeDay, setActiveDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const data = await api.teacherApi.schedule();
      setScheduleData(data);
      if (!activeDay && data.days?.length > 0) {
        // Auto-select today or first day
        const today = new Date().getDay();
        const todayStr = String(today);
        const todayDay = data.days.find(d => d.id === todayStr);
        setActiveDay(todayDay ? todayDay.id : data.days[0]?.id);
      }
    } catch (e) {
      console.warn('Failed to load schedule:', e);
    }
  }, [activeDay]);

  useEffect(() => {
    fetchSchedule().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule();
    setRefreshing(false);
  };

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleJoin = (item) => {
    Alert.alert('Join Live Class', `${item.title} (${item.location})\n\nThe live session link will open here once the backend is connected.`);
  };

  const handleItem = (item) => {
    if (item.canJoin) {
      handleJoin(item);
    } else {
      Alert.alert(item.title, `${item.time} • ${item.location}`);
    }
  };

  const day = scheduleData.days?.find((d) => d.id === activeDay) || scheduleData.days?.[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0050d4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Weekly Schedule</Text>
          <Text style={styles.subtitle}>Classes, labs and meetings</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0050d4']} />}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabs}
        >
          {scheduleData.days?.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.dayTab, activeDay === d.id && styles.dayTabActive]}
              onPress={() => setActiveDay(d.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayTabLabel, activeDay === d.id && styles.dayTabLabelActive]}>
                {d.label.slice(0, 3)}
              </Text>
              <Text style={[styles.dayTabDate, activeDay === d.id && styles.dayTabDateActive]}>
                {d.date}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {day && (
          <>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{day.label}</Text>
              <Text style={styles.dayCount}>{day.items?.length || 0} sessions</Text>
            </View>

            <View style={styles.list}>
              {day.items?.map((item) => (
                <TouchableOpacity key={item.id} style={styles.card} onPress={() => handleItem(item)} activeOpacity={0.9}>
                  <View style={[styles.timeBlock, item.canJoin && styles.timeBlockLive]}>
                    <Text style={styles.timeText}>{item.time?.split(' – ')[0]}</Text>
                    <Text style={styles.timeTextEnd}>{item.time?.split(' – ')[1]}</Text>
                  </View>
                  <View style={styles.info}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {item.mode === 'VIRTUAL' && (
                        <View style={styles.virtualBadge}>
                          <MaterialIcons name="videocam" size={12} color="#702ae1" />
                          <Text style={styles.virtualText}>Virtual</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.locationRow}>
                      <MaterialIcons name="place" size={14} color="#8a8f94" />
                      <Text style={styles.location}>{item.location}</Text>
                    </View>
                  </View>
                  {item.canJoin ? (
                    <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(item)} activeOpacity={0.8}>
                      <Text style={styles.joinText}>Join</Text>
                    </TouchableOpacity>
                  ) : (
                    <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
                  )}
                </TouchableOpacity>
              ))}

              {(!day.items || day.items.length === 0) && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No classes scheduled</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e9eb' },
  headerText: { flex: 1 },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, fontWeight: '700', color: '#2c2f31' },
  subtitle: { fontFamily: 'Manrope-Medium', fontSize: 12, fontWeight: '500', color: '#8a8f94', marginTop: 2 },
  headerRight: { width: 40 },
  dayTabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e9eb', alignItems: 'center', minWidth: 72 },
  dayTabActive: { backgroundColor: '#0050d4', borderColor: '#0050d4' },
  dayTabLabel: { fontFamily: 'Manrope-Bold', fontSize: 12, fontWeight: '700', color: '#595c5e', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayTabLabelActive: { color: '#ffffff' },
  dayTabDate: { fontFamily: 'Manrope-Medium', fontSize: 10, fontWeight: '500', color: '#8a8f94', marginTop: 2 },
  dayTabDateActive: { color: 'rgba(255, 255, 255, 0.8)' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 12 },
  dayTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 18, fontWeight: '700', color: '#2c2f31' },
  dayCount: { fontFamily: 'Manrope-Medium', fontSize: 12, fontWeight: '500', color: '#8a8f94' },
  list: { paddingHorizontal: 20, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e8ec', gap: 14 },
  timeBlock: { width: 64, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eef1f3', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timeBlockLive: { backgroundColor: 'rgba(0, 80, 212, 0.1)' },
  timeText: { fontFamily: 'Manrope-Bold', fontSize: 11, fontWeight: '700', color: '#2c2f31' },
  timeTextEnd: { fontFamily: 'Manrope-Bold', fontSize: 11, fontWeight: '700', color: '#8a8f94', marginTop: 2 },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  itemTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 14, fontWeight: '700', color: '#2c2f31', flexShrink: 1 },
  virtualBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(112, 42, 225, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  virtualText: { fontFamily: 'Manrope-Bold', fontSize: 9, fontWeight: '700', color: '#702ae1' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontFamily: 'Manrope-Medium', fontSize: 12, fontWeight: '500', color: '#8a8f94' },
  joinButton: { backgroundColor: '#0050d4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999 },
  joinText: { fontFamily: 'Manrope-Bold', fontSize: 12, fontWeight: '700', color: '#ffffff' },
});
