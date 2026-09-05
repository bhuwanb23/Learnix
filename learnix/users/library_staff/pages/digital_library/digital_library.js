import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const resources = [
  {
    id: '1',
    title: 'Data Structures & Algorithms',
    type: 'E-Book',
    author: 'Narasimha Karumanchi',
    category: 'Computer Science',
    format: 'PDF',
    size: '8.2 MB',
    downloads: 342,
    color: '#2563eb',
    icon: 'book',
  },
  {
    id: '2',
    title: 'Engineering Mathematics',
    type: 'E-Book',
    author: 'Grewal',
    category: 'Mathematics',
    format: 'PDF',
    size: '12.4 MB',
    downloads: 287,
    color: '#0891b2',
    icon: 'book',
  },
  {
    id: '3',
    title: 'NPTEL — Machine Learning',
    type: 'Video Course',
    author: 'IIT Madras',
    category: 'Computer Science',
    format: 'Video',
    size: '24 hrs',
    downloads: 198,
    color: '#2563eb',
    icon: 'videocam',
  },
  {
    id: '4',
    title: 'Journal of Applied Physics',
    type: 'Journal',
    author: 'AIP Publishing',
    category: 'Physics',
    format: 'Online',
    size: '12 issues',
    downloads: 156,
    color: '#059669',
    icon: 'newspaper',
  },
  {
    id: '5',
    title: 'Organic Chemistry (Morrison & Boyd)',
    type: 'E-Book',
    author: 'Morrison & Boyd',
    category: 'Chemistry',
    format: 'PDF',
    size: '16.8 MB',
    downloads: 231,
    color: '#d97706',
    icon: 'book',
  },
  {
    id: '6',
    title: 'The Art of Public Speaking',
    type: 'Audiobook',
    author: 'Dale Carnegie',
    category: 'Soft Skills',
    format: 'Audio',
    size: '6 hrs',
    downloads: 124,
    color: '#dc2626',
    icon: 'headset',
  },
];

const categories = ['All', 'E-Books', 'Journals', 'Video Courses', 'Audiobooks'];

export default function DigitalLibrary({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('Resources');

  const filtered =
    activeCategory === 'All'
      ? resources
      : resources.filter((r) =>
          activeCategory === 'E-Books'
            ? r.type === 'E-Book'
            : activeCategory === 'Journals'
            ? r.type === 'Journal'
            : activeCategory === 'Video Courses'
            ? r.type === 'Video Course'
            : r.type === 'Audiobook'
        );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Digital Library</Text>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>248</Text>
            <Text style={styles.statLabel}>Resources</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1.3k</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>156</Text>
            <Text style={styles.statLabel}>Downloads Today</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabsRow}>
        {['Resources', 'Uploads'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Resources' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, activeCategory === cat && styles.chipActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filtered.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: item.color + '1a' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardAuthor} numberOfLines={1}>
                  {item.author}
                </Text>
                <View style={styles.metaRow}>
                  <View style={[styles.typeChip, { backgroundColor: item.color + '14' }]}>
                    <Text style={[styles.typeText, { color: item.color }]}>{item.type}</Text>
                  </View>
                  <Text style={styles.metaText}>
                    {item.format} · {item.size}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Text style={styles.downloadText}>{item.downloads} DLs</Text>
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() =>
                    Alert.alert(item.type, `${item.title} — ${item.size} ${item.format}. Streaming link opens for members.`)
                  }
                >
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cloud-upload-outline" size={36} color="#2563eb" />
            </View>
            <Text style={styles.emptyTitle}>Upload new resource</Text>
            <Text style={styles.emptyText}>
              Add e-books, journals, video courses or audiobooks to the digital library for students
              and staff.
            </Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() =>
                Alert.alert('Upload Resource', 'File picker opens here — PDF, EPUB, MP4, MP3 up to 200 MB.')
              }
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.uploadBtnText}>Upload Resource</Text>
            </TouchableOpacity>
            <Text style={styles.noteText}>
              Format support: PDF, EPUB, MP4, MP3 · Max 200 MB
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingTop: theme.spacing.xl + 10,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: theme.colors.primary },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  chipsRow: { flexDirection: 'row', paddingVertical: theme.spacing.md, flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  cardAuthor: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  typeText: { fontSize: 10, fontFamily: 'Manrope-Bold' },
  metaText: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  cardActions: { alignItems: 'flex-end', marginLeft: 8 },
  downloadText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  openBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 20 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  uploadBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  noteText: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 12,
  },
});