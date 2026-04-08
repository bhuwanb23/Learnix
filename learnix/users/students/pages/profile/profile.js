import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
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

  return (
    <SafeAreaView style={styles.container}>
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
        <View style={styles.contentGrid}>
          {/* Left Column: Categories & Honors */}
          <View style={styles.leftColumn}>
            <QuickActions categories={CATEGORIES} honors={HONORS} />
          </View>

          {/* Right Column: Wallet & Settings Summary */}
          <View style={styles.rightColumn}>
            {/* Scholar Wallet */}
            <CampusWallet walletInfo={WALLET_INFO} />
            
            {/* Quick Settings & Support */}
            <Settings />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
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
    marginHorizontal: 24, // px-6
    marginTop: 32, // gap-8 spacing from stats
    flexDirection: 'column', // stack for mobile
    gap: 32, // gap-8
  },
  leftColumn: {
    gap: 32, // space-y-8
  },
  rightColumn: {
    gap: 24, // space-y-6
  },
});
