import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ANNOUNCEMENT_STATS, PUBLISHED, PENDING_QUEUE } from './constants/announcementsData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import ActionButton from '../../components/ui/ActionButton';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const AUDIENCES = ['All Students', 'Final Year Students', 'CSE & ECE Students', 'Teachers', 'Everyone'];

export default function AnnouncementsModule({ navigation }) {
  const [tab, setTab] = useState('published');
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', audience: 'All Students' });

  const handleApprove = (item) => {
    Alert.alert(
      'Approve & Publish',
      `Publish "${item.title}" to ${item.audience}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => Alert.alert('Published', 'Announcement is now live for the target audience.') },
      ]
    );
  };

  const handleReject = (item) => {
    Alert.alert(
      'Reject Announcement',
      `Reject "${item.title}"? The requester will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => Alert.alert('Rejected', 'Announcement returned to the requester with feedback.') },
      ]
    );
  };

  const handleCompose = () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Missing Fields', 'Please enter both a title and message content.');
      return;
    }
    Alert.alert(
      'Publish Announcement',
      `Send "${form.title}" to ${form.audience}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => {
            setForm({ title: '', content: '', audience: 'All Students' });
            setShowCompose(false);
            Alert.alert('Published', 'Announcement sent to all recipients.');
          },
        },
      ]
    );
  };

  if (showCompose) {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setShowCompose(false)} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color="#2563eb" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>New Announcement</Text>
              <Text style={styles.headerSubtitle}>Compose a broadcast message</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              placeholder="e.g. Exam Schedule Released"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Message</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.content}
              onChangeText={(v) => setForm((p) => ({ ...p, content: v }))}
              placeholder="Write your announcement message..."
              placeholderTextColor="#cbd5e1"
              multiline
            />
          </View>

          <Text style={styles.fieldLabel}>Target Audience</Text>
          <View style={styles.audienceGrid}>
            {AUDIENCES.map((aud) => (
              <TouchableOpacity
                key={aud}
                style={[styles.audienceChip, form.audience === aud && styles.audienceChipActive]}
                onPress={() => setForm((p) => ({ ...p, audience: aud }))}
                activeOpacity={0.8}
              >
                <Text style={[styles.audienceText, form.audience === aud && styles.audienceTextActive]}>
                  {aud}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.spacer} />
          <ActionButton label="Publish Announcement" icon="megaphone" onPress={handleCompose} />
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {ANNOUNCEMENT_STATS.map((stat) => (
          <StatCard key={stat.id} icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} />
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {['published', 'pending'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.activeTab]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === 'published' ? 'Published' : `Pending (${PENDING_QUEUE.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ActionButton
        label="Compose Announcement"
        icon="create"
        variant="secondary"
        onPress={() => setShowCompose(true)}
      />
      <View style={styles.spacer} />

      {tab === 'published' ? (
        <>
          <SectionHeader title="Published Announcements" />
          {PUBLISHED.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.announcementCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(item.title, item.content)}
            >
              <View style={[styles.announcementIcon, { backgroundColor: item.color + '14' }]}>
                <Ionicons name="megaphone" size={18} color={item.color} />
              </View>
              <View style={styles.announcementInfo}>
                <Text style={styles.announcementTitle}>{item.title}</Text>
                <Text style={styles.announcementContent} numberOfLines={2}>{item.content}</Text>
                <Text style={styles.announcementMeta}>
                  {item.audience} • {item.author} • {item.publishedAt}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'pending' ? (
        <>
          <SectionHeader title="Approval Queue" />
          {PENDING_QUEUE.map((item) => (
            <View key={item.id} style={styles.pendingCard}>
              <View style={[styles.pendingIcon, { backgroundColor: item.color + '14' }]}>
                <Ionicons name="time" size={18} color={item.color} />
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingTitle}>{item.title}</Text>
                <Text style={styles.pendingContent} numberOfLines={2}>{item.content}</Text>
                <Text style={styles.pendingMeta}>
                  {item.requestedBy} • {item.requestedAt} • Target: {item.audience}
                </Text>
              </View>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={[styles.pendingBtn, styles.approveBtn]}
                  onPress={() => handleApprove(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pendingBtn, styles.rejectBtn]}
                  onPress={() => handleReject(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  announcementIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  announcementInfo: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  announcementContent: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
    lineHeight: 15,
  },
  announcementMeta: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  pendingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  pendingContent: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
    lineHeight: 15,
  },
  pendingMeta: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  pendingBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#059669',
  },
  rejectBtn: {
    backgroundColor: '#fef2f2',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
    marginBottom: 6,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: SPACING.md,
  },
  textAreaContainer: {
    minHeight: 120,
    alignItems: 'flex-start',
  },
  input: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
    padding: 0,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  audienceChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  audienceChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  audienceText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Manrope-SemiBold',
  },
  audienceTextActive: {
    color: '#ffffff',
  },
  spacer: {
    height: SPACING.md,
  },
});