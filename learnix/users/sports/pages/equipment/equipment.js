import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialItems = [
  { id: '1', name: 'Cricket Bat', category: 'Cricket', total: 24, available: 18, out: 6, condition: 'Good', color: '#2563eb' },
  { id: '2', name: 'Football', category: 'Football', total: 30, available: 21, out: 9, condition: 'Good', color: '#059669' },
  { id: '3', name: 'Basketball', category: 'Basketball', total: 16, available: 12, out: 4, condition: 'Good', color: '#d97706' },
  { id: '4', name: 'Badminton Racket', category: 'Badminton', total: 20, available: 15, out: 5, condition: 'Fair', color: '#0891b2' },
  { id: '5', name: 'Tennis Ball (pack)', category: 'Tennis', total: 40, available: 34, out: 6, condition: 'New', color: '#dc2626' },
  { id: '6', name: 'Dumbbell Set', category: 'Gym', total: 12, available: 10, out: 2, condition: 'Good', color: '#0284c7' },
];

const issuedTo = [
  { id: '1', item: 'Cricket Bat', student: 'Karan Singh', issued: 'Nov 10', due: 'Nov 20', overdue: false },
  { id: '2', item: 'Football', student: 'Vikram Nair', issued: 'Oct 28', due: 'Nov 7', overdue: true },
  { id: '3', item: 'Badminton Racket', student: 'Divya Menon', issued: 'Nov 12', due: 'Nov 19', overdue: false },
];

const conditionStyle = (c) => {
  if (c === 'New') return { bg: '#dcfce7', color: '#059669' };
  if (c === 'Good') return { bg: '#dbeafe', color: '#2563eb' };
  return { bg: '#fef3c7', color: '#d97706' };
};

export default function EquipmentModule({ navigation }) {
  const [tab, setTab] = useState('Inventory');

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>142</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>47</Text>
          <Text style={styles.statLabel}>Issued Out</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>9</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {['Inventory', 'Issued Out'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        {tab === 'Inventory' && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => Alert.alert('Add Equipment', 'Equipment entry form opens here — name, category and quantity.')}
          >
            <Ionicons name="add" size={15} color="#fff" />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {tab === 'Inventory' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {initialItems.map((item) => {
            const st = conditionStyle(item.condition);
            const pct = Math.round((item.available / item.total) * 100);
            return (
              <View key={item.id} style={styles.card}>
                <View style={[styles.itemIcon, { backgroundColor: item.color + '1a' }]}>
                  <Ionicons
                    name={
                      item.category === 'Cricket'
                        ? 'baseball-outline'
                        : item.category === 'Gym'
                        ? 'barbell-outline'
                        : 'basketball-outline'
                    }
                    size={18}
                    color={item.color}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.category} · {item.available}/{item.total} available
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: pct + '%', backgroundColor: item.color }]}
                    />
                  </View>
                </View>
                <View style={[styles.condChip, { backgroundColor: st.bg }]}>
                  <Text style={[styles.condText, { color: st.color }]}>{item.condition}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {issuedTo.map((i) => (
            <View key={i.id} style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{i.student.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.itemName}>{i.item}</Text>
                <Text style={styles.itemMeta}>
                  {i.student} · Issued {i.issued}
                </Text>
                <Text style={[styles.dueText, { color: i.overdue ? '#dc2626' : theme.colors.textMuted }]}>
                  Due {i.due} {i.overdue ? '· OVERDUE' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.returnBtn, { backgroundColor: i.overdue ? '#fee2e2' : '#dcfce7' }]}
                onPress={() =>
                  Alert.alert('Return', `${i.item} returned by ${i.student} — inventory updated.`)
                }
              >
                <Text style={[styles.returnText, { color: i.overdue ? '#dc2626' : '#059669' }]}>
                  Return
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.issueBtn}
            onPress={() => Alert.alert('Issue Item', 'Student + item picker opens here to issue equipment.')}
          >
            <Ionicons name="arrow-forward-circle-outline" size={16} color="#fff" />
            <Text style={styles.issueText}>Issue Equipment</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 'auto',
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
  list: { paddingTop: 12, paddingBottom: 24 },
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
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  itemName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  itemMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: { height: 5, borderRadius: 3 },
  condChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  condText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
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
  dueText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    marginTop: 4,
  },
  returnBtn: {
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  returnText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
  },
  issueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 8,
  },
  issueText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 6,
  },
});