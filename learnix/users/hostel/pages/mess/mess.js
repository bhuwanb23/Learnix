import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard } from '../../../../components/ui';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const menu = {
  Mon: { breakfast: 'Idli, Sambar, Chutney', lunch: 'Rice, Dal, Paneer Curry, Salad', dinner: 'Chapati, Mixed Veg, Rice' },
  Tue: { breakfast: 'Poha, Boiled Egg', lunch: 'Rice, Rajma, Jeera Aloo', dinner: 'Roti, Butter Chicken, Rice' },
  Wed: { breakfast: 'Dosa, Coconut Chutney', lunch: 'Rice, Chole, Curd', dinner: 'Chapati, Dal Tadka, Rice' },
  Thu: { breakfast: 'Upma, Banana', lunch: 'Rice, Sambar, Veg Pulao', dinner: 'Roti, Paneer Butter Masala' },
  Fri: { breakfast: 'Aloo Paratha, Curd', lunch: 'Rice, Fish Curry, Salad', dinner: 'Chapati, Mixed Veg, Rice' },
  Sat: { breakfast: 'Puri Bhaji', lunch: 'Biryani, Raita', dinner: 'Roti, Chole, Rice' },
  Sun: { breakfast: 'Chole Bhature', lunch: 'Special Thali', dinner: 'Noodles, Manchurian' },
};

const plans = [
  { id: 'veg', name: 'Veg Plan', count: 892, price: '₹3,200/mo', color: '#059669' },
  { id: 'nonveg', name: 'Non-Veg Plan', count: 356, price: '₹3,800/mo', color: '#d97706' },
];

const attendance = [
  { meal: 'Breakfast', served: '1,182 / 1,248', pct: 95, color: '#059669' },
  { meal: 'Lunch', served: '1,210 / 1,248', pct: 97, color: '#2563eb' },
  { meal: 'Dinner', served: '1,141 / 1,248', pct: 91, color: '#0891b2' },
];

const feedback = [
  { date: 'Last night', meal: 'Dinner', rating: 4.3, note: 'Dal tadka was great, rotis a bit hard' },
  { date: 'Yesterday', meal: 'Lunch', rating: 4.1, note: 'Paneer curry well received' },
  { date: 'Mon', meal: 'Breakfast', rating: 3.8, note: 'Idli batter needs more fermentation' },
];

export default function MessModule({ navigation }) {
  const [selectedDay, setSelectedDay] = useState('Mon');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Stats */}
      <AnimatedCard delay={0}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1,248</Text>
          <Text style={styles.statLabel}>Residents</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>4.1★</Text>
          <Text style={styles.statLabel}>Weekly Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹3.4L</Text>
          <Text style={styles.statLabel}>Monthly Budget</Text>
        </View>
      </View>
      </AnimatedCard>

      {/* Weekly Menu */}
      <AnimatedCard delay={80} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weekly Menu</Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Edit Menu', 'Menu editor opens here — update any meal for the week.')}
          >
            <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {days.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, selectedDay === d && styles.dayChipActive]}
              onPress={() => setSelectedDay(d)}
            >
              <Text style={[styles.dayText, selectedDay === d && styles.dayTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.menuCard}>
          {[
            { label: 'Breakfast', value: menu[selectedDay].breakfast, icon: 'sunny-outline', color: '#d97706' },
            { label: 'Lunch', value: menu[selectedDay].lunch, icon: 'restaurant-outline', color: '#2563eb' },
            { label: 'Dinner', value: menu[selectedDay].dinner, icon: 'moon-outline', color: '#0891b2' },
          ].map((m, idx) => (
            <View key={m.label}>
              <View style={styles.mealRow}>
                <View style={[styles.mealIcon, { backgroundColor: m.color + '1a' }]}>
                  <Ionicons name={m.icon} size={16} color={m.color} />
                </View>
                <View style={styles.mealBody}>
                  <Text style={styles.mealLabel}>{m.label}</Text>
                  <Text style={styles.mealValue}>{m.value}</Text>
                </View>
              </View>
              {idx < 2 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </AnimatedCard>

      {/* Meal Plans */}
      <AnimatedCard delay={160} style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Plans</Text>
        <View style={styles.planRow}>
          {plans.map((p) => (
            <View key={p.id} style={styles.planCard}>
              <View style={[styles.planIcon, { backgroundColor: p.color + '1a' }]}>
                <Ionicons
                  name={p.id === 'veg' ? 'leaf-outline' : 'restaurant-outline'}
                  size={18}
                  color={p.color}
                />
              </View>
              <Text style={styles.planName}>{p.name}</Text>
              <Text style={styles.planCount}>{p.count} residents</Text>
              <Text style={[styles.planPrice, { color: p.color }]}>{p.price}</Text>
            </View>
          ))}
        </View>
      </AnimatedCard>

      {/* Attendance */}
      <AnimatedCard delay={240} style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        <View style={styles.attendanceCard}>
          {attendance.map((a) => (
            <View key={a.meal} style={styles.attendanceRow}>
              <Text style={styles.attendanceLabel}>{a.meal}</Text>
              <View style={styles.attendanceTrack}>
                <View
                  style={[
                    styles.attendanceFill,
                    { width: a.pct + '%', backgroundColor: a.color },
                  ]}
                />
              </View>
              <Text style={styles.attendanceValue}>{a.served}</Text>
            </View>
          ))}
        </View>
      </AnimatedCard>

      {/* Feedback */}
      <AnimatedCard delay={320} style={styles.section}>
        <Text style={styles.sectionTitle}>Resident Feedback</Text>
        {feedback.map((f) => (
          <View key={f.meal + f.date} style={styles.feedbackCard}>
            <View style={styles.feedbackTop}>
              <View>
                <Text style={styles.feedbackMeal}>{f.meal} · {f.date}</Text>
                <Text style={styles.feedbackNote}>{f.note}</Text>
              </View>
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={12} color="#d97706" />
                <Text style={styles.ratingText}>{f.rating}</Text>
              </View>
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={styles.surveyBtn}
          onPress={() => Alert.alert('Feedback Survey', 'Push a meal-rating survey to all residents.')}
        >
          <Ionicons name="pulse-outline" size={16} color="#fff" />
          <Text style={styles.surveyText}>Send Rating Survey</Text>
        </TouchableOpacity>
      </AnimatedCard>
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
  section: { marginTop: 18 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  dayChipActive: { backgroundColor: theme.colors.primary },
  dayText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  dayTextActive: { color: '#fff' },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 12,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mealBody: { flex: 1 },
  mealLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealValue: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 4,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  planCount: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    marginTop: 6,
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attendanceLabel: {
    width: 74,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  attendanceTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  attendanceFill: { height: 7, borderRadius: 4 },
  attendanceValue: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  feedbackTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  feedbackMeal: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  feedbackNote: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
    marginLeft: 4,
  },
  surveyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 6,
  },
  surveyText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 6,
  },
});