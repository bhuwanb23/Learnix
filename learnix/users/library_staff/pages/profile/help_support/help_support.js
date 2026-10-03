import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';

const THEME = '#2563eb';

const FAQ = [
  {
    q: 'How many books can a student hold?',
    a: (p) => `${p.maxActiveLoans} at a time. Issuing stops at that number even if the shelf has copies free.`,
  },
  {
    q: 'How long is a loan?',
    a: (p) => `${p.loanPeriodDays} days by default. The desk can override the period per issue when a student asks.`,
  },
  {
    q: 'Can a book be renewed?',
    a: (p) =>
      p.maxRenewalsPerLoan === 0
        ? 'No — this library does not allow renewals, so a loan runs to its due date.'
        : `Up to ${p.maxRenewalsPerLoan} times per loan, and only while the book is not overdue.`,
  },
  {
    q: 'How is an overdue fine worked out?',
    a: (p) => `₹${p.finePerDayRupees} for each day a book is late. It is calculated when the book comes back.`,
  },
  {
    q: 'When do unpaid fines stop a student borrowing?',
    a: (p) => `Once unpaid fines exceed ₹${p.maxOutstandingFineRupees}. Collect or waive the fine to restore borrowing.`,
  },
  {
    q: 'What does "auto fines" off mean?',
    a: () =>
      'Returning a late book still records how many days it was late, but no fine is raised automatically — you create it yourself so you can judge each case.',
  },
  {
    q: 'Are reminders sent automatically?',
    a: () =>
      'Not yet. The reminder screen shows which students fall into each due-date stage so you can broadcast to them yourself.',
  },
];

export default function HelpSupport({ navigation }) {
  const [policy, setPolicy] = useState(null);
  const [open, setOpen] = useState(0);

  const fetchPolicy = useCallback(async () => {
    try {
      const s = await libraryApi.librarySettings();
      setPolicy({
        maxActiveLoans: s.maxActiveLoans,
        loanPeriodDays: s.loanPeriodDays,
        maxRenewalsPerLoan: s.maxRenewalsPerLoan,
        finePerDayRupees: s.finePerDayRupees,
        maxOutstandingFineRupees: s.maxOutstandingFineRupees,
        openTime: s.openTime,
        closeTime: s.closeTime,
        closedDays: s.closedDays || [],
      });
    } catch (err) {
      setPolicy(null);
    }
  }, []);

  useEffect(() => { fetchPolicy(); }, [fetchPolicy]);

  // `tab` targets open the bottom-nav tabs; the rest are sub-pages.
  const SHORTCUTS = [
    { tab: 'Circulation', icon: 'swap-horizontal-outline', label: 'Issue, renew and return', color: '#2563eb' },
    { tab: 'Fines', icon: 'cash-outline', label: 'Collect or waive a fine', color: '#dc2626' },
    { key: 'Requests', icon: 'cart-outline', label: 'Decide a book request', color: '#d97706' },
    { key: 'ComposeBroadcast', icon: 'megaphone-outline', label: 'Message students', color: THEME },
    { key: 'ReminderSchedule', icon: 'alarm-outline', label: 'See who needs a reminder', color: '#0891b2' },
  ];

  const go = (s) => {
    if (s.tab) navigation.switchTab(s.tab);
    else navigation.openModule(s.key);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Shortcuts */}
      <Text style={styles.sectionLabel}>Jump to a task</Text>
      {SHORTCUTS.map((s, idx) => (
        <AnimatedCard key={s.tab || s.key} delay={idx * 40} style={styles.block} onPress={() => go(s)}>
          <View style={styles.shortcutRow}>
            <View style={[styles.shortcutIcon, { backgroundColor: s.color + '14' }]}>
              <Ionicons name={s.icon} size={17} color={s.color} />
            </View>
            <Text style={styles.shortcutLabel}>{s.label}</Text>
            <Ionicons name="arrow-forward" size={15} color="#cbd5e1" />
          </View>
        </AnimatedCard>
      ))}

      {/* FAQ — answers quote the live policy */}
      <Text style={styles.sectionLabel}>How this library works</Text>
      {!policy ? (
        <SkeletonCard />
      ) : (
        FAQ.map((f, idx) => {
          const isOpen = open === idx;
          return (
            <AnimatedCard key={f.q} delay={60 + idx * 35} style={styles.block}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => setOpen(isOpen ? -1 : idx)}
                activeOpacity={0.75}
              >
                <Text style={styles.faqQ}>{f.q}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
              </TouchableOpacity>
              {isOpen ? <Text style={styles.faqA}>{f.a(policy)}</Text> : null}
            </AnimatedCard>
          );
        })
      )}

      {/* Timings */}
      {policy ? (
        <AnimatedCard delay={340} style={styles.block}>
          <View style={styles.timingRow}>
            <Ionicons name="time-outline" size={17} color={THEME} />
            <View style={styles.timingBody}>
              <Text style={styles.timingTitle}>Library timings</Text>
              <Text style={styles.timingText}>
                Open {policy.openTime} – {policy.closeTime}
                {policy.closedDays.length
                  ? `, closed on ${policy.closedDays.map((d) => d.charAt(0) + d.slice(1).toLowerCase()).join(', ')}`
                  : ', open every day'}
                .
              </Text>
            </View>
          </View>
        </AnimatedCard>
      ) : null}

      {/* What isn't automated — stated plainly */}
      <AnimatedCard delay={360} style={styles.block}>
        <View style={styles.noteRow}>
          <Ionicons name="alert-circle-outline" size={16} color="#d97706" />
          <Text style={styles.noteText}>
            Overdue status is recalculated from due dates each time a screen loads, so nothing here depends on a nightly
            job. What is not automated yet: reminder delivery, fine emails, and book-request procurement — those are
            desk tasks today.
          </Text>
        </View>
      </AnimatedCard>

      <AnimatedCard delay={380} style={styles.block}>
        <View style={styles.noteRow}>
          <Ionicons name="document-text-outline" size={16} color="#64748b" />
          <Text style={styles.noteText}>
            Full module specification and endpoint list live in docs/users/07-library-staff.md in the repository.
          </Text>
        </View>
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 10 },

  shortcutRow: { flexDirection: 'row', alignItems: 'center', padding: 13 },
  shortcutIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  shortcutLabel: { flex: 1, fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },

  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  faqQ: { flex: 1, fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a', marginRight: 10 },
  faqA: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, paddingHorizontal: 14, paddingBottom: 14 },

  timingRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  timingBody: { flex: 1, marginLeft: 10 },
  timingTitle: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#0f172a' },
  timingText: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16, marginTop: 2 },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});
