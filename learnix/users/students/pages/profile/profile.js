import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';

// Import components
import ProfileHeader from './components/ProfileHeader';
import ProfileStats from './components/ProfileStats';
import QuickActions from './components/QuickActions'; // Will become Categories & Honors
import CampusWallet from './components/CampusWallet';
import Settings from './components/Settings'; // Will become Quick Settings

// Import constants
import {
  PROFILE_INFO,
  PROFILE_STATS,
  CATEGORIES,
  HONORS,
  WALLET_INFO,
} from './constants/profileData';

export default function Profile() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const contentPadding = width >= 768 ? 32 : 16;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Header & Identity Hero */}
        <ProfileHeader user={PROFILE_INFO} />
        
        {/* Stats Grid (CGPA, Attendance, Credits, Rank) */}
        <ProfileStats stats={PROFILE_STATS} />
        
        {/* Main Content Area */}
        <View style={[
          styles.contentGrid, 
          { paddingHorizontal: contentPadding },
          isDesktop && styles.contentGridDesktop
        ]}>
          {/* Left Column: Categories & Honors */}
          <View style={[styles.leftColumn, isDesktop && { flex: 8 }]}>
            <QuickActions categories={CATEGORIES} honors={HONORS} />
          </View>

          {/* Right Column: Wallet & Settings Summary */}
          <View style={[styles.rightColumn, isDesktop && { flex: 4 }]}>
            {/* Scholar Wallet */}
            <CampusWallet walletInfo={WALLET_INFO} />
            
            {/* Quick Settings & Support */}
            <Settings />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9', // bg-surface
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // pb-32
  },
  contentGrid: {
    marginTop: 32, // gap-8 spacing from stats
    flexDirection: 'column', // stack for mobile
    gap: 24, // gap-8
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  contentGridDesktop: {
    flexDirection: 'row',
  },
  leftColumn: {
    gap: 24, // space-y-8
  },
  rightColumn: {
    gap: 24, // space-y-6
  },
});
