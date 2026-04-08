import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function Sidebar({ registrations, stats, trendingTags }) {
  return (
    <View style={styles.sidebar}>
      {/* My Registrations */}
      <View style={styles.sidebarSection}>
        <View style={styles.sidebarHeader}>
          <MaterialIcons name="confirmation-number" size={24} color="#0050d4" />
          <Text style={styles.sidebarTitle}>My Registrations</Text>
        </View>
        {registrations.map((reg) => (
          <View key={reg.id} style={[styles.registrationCard, { borderLeftColor: reg.borderColor }]}>
            <View style={styles.registrationHeader}>
              <View>
                <Text style={styles.registrationTitle}>{reg.title}</Text>
                <Text style={styles.registrationDate}>{reg.datetime}</Text>
              </View>
              <TouchableOpacity>
                <MaterialIcons name="more-vert" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={styles.registrationBody}>
              <View style={styles.qrContainer}>
                <Image source={{ uri: reg.qrCode }} style={styles.qrImage} />
              </View>
              <View style={styles.registrationInfo}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.reminderLabel}>REMINDER</Text>
                  <View style={[styles.toggleTrack, reg.reminderActive ? styles.toggleActive : styles.toggleInactive]}>
                    <View style={[styles.toggleThumb, reg.reminderActive ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
                  </View>
                </View>
                <Text style={[styles.reminderText, { color: reg.reminderColor }]}>{reg.reminderText}</Text>
              </View>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.viewAllBtn}>
          <Text style={styles.viewAllBtnText}>View All Tickets</Text>
        </TouchableOpacity>
      </View>

      {/* Bento Stats */}
      <View style={styles.bentoGrid}>
        <View style={styles.bentoCard1}>
          <MaterialIcons name="calendar-month" size={24} color="#0050d4" style={styles.bentoIcon} />
          <Text style={styles.bentoValue1}>{stats.upcoming}</Text>
          <Text style={styles.bentoLabel1}>UPCOMING</Text>
        </View>
        <View style={styles.bentoCard2}>
          <MaterialIcons name="stars" size={24} color="#702ae1" style={styles.bentoIcon} />
          <Text style={styles.bentoValue2}>{stats.xpEarned}</Text>
          <Text style={styles.bentoLabel2}>XP EARNED</Text>
        </View>
      </View>

      {/* Trending Tags */}
      <View style={styles.trendingSection}>
        <Text style={styles.trendingTitle}>Trending Tags</Text>
        <View style={styles.tagsContainer}>
          {trendingTags.map((tag, idx) => (
            <TouchableOpacity key={idx} style={styles.tagBtn}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    gap: 32,
    width: '100%',
    marginBottom: 32,
  },
  sidebarSection: {
    backgroundColor: '#eef1f3',
    padding: 24,
    borderRadius: 16,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  registrationCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  registrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  registrationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Manrope-Bold',
  },
  registrationDate: {
    fontSize: 10,
    color: '#595c5e',
    fontFamily: 'Manrope-Regular',
  },
  registrationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrContainer: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  qrImage: {
    width: 40,
    height: 40,
    opacity: 0.5,
  },
  registrationInfo: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    fontFamily: 'Manrope-Bold',
  },
  toggleTrack: {
    width: 32,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#0050d4',
  },
  toggleInactive: {
    backgroundColor: '#e2e8f0',
  },
  toggleThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    position: 'absolute',
  },
  toggleThumbActive: {
    right: 2,
  },
  toggleThumbInactive: {
    left: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  reminderText: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
  },
  viewAllBtn: {
    width: '100%',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 80, 212, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllBtnText: {
    color: '#0050d4',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  bentoCard1: {
    flex: 1,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    padding: 16,
    borderRadius: 16,
  },
  bentoCard2: {
    flex: 1,
    backgroundColor: 'rgba(112, 42, 225, 0.1)',
    padding: 16,
    borderRadius: 16,
  },
  bentoIcon: {
    marginBottom: 8,
  },
  bentoValue1: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0050d4',
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  bentoLabel1: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(0, 80, 212, 0.6)',
    fontFamily: 'Manrope-Bold',
  },
  bentoValue2: {
    fontSize: 24,
    fontWeight: '900',
    color: '#702ae1',
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  bentoLabel2: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(112, 42, 225, 0.6)',
    fontFamily: 'Manrope-Bold',
  },
  trendingSection: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.1)',
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Manrope-Bold',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBtn: {
    backgroundColor: '#eef1f3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#595c5e',
    fontFamily: 'Manrope-SemiBold',
  },
});