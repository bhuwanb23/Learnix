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
import ProfileStats from './components/ProfileStats';
import QuickActions from './components/QuickActions';
import HabitTracker from './components/HabitTracker';
import CampusWallet from './components/CampusWallet';
import Achievements from './components/Achievements';
import Settings from './components/Settings';
import CounselorBooking from './components/CounselorBooking';
import FeePayment from './components/FeePayment';

// Import hooks and constants
import { useProfile } from './hooks/useProfile';
import { QUICK_ACTIONS, COUNSELORS, OUTSTANDING_FEES } from './constants/profileData';

export default function Profile() {
  const {
    stats,
    habits,
    achievements,
    toggleHabit,
    getCompletedHabitsCount,
    getTotalHabitsCount,
  } = useProfile();

  const [showCounselorBooking, setShowCounselorBooking] = useState(false);
  const [showFeePayment, setShowFeePayment] = useState(false);

  const user = {
    name: 'Sarah Chen',
    title: 'Computer Science • Year 3',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
  };

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'counselor':
        setShowCounselorBooking(true);
        break;
      case 'payments':
        setShowFeePayment(true);
        break;
      default:
        Alert.alert('Coming Soon', 'This feature will be available soon!');
    }
  };

  const handleNotificationPress = () => {
    Alert.alert('Notifications', 'You have 3 new notifications');
  };

  const handleSettingsPress = () => {
    Alert.alert('Settings', 'Settings will be available soon!');
  };

  const handleAddFunds = () => {
    Alert.alert('Add Funds', 'Add funds feature will be available soon!');
  };

  const handleViewHistory = () => {
    Alert.alert('Transaction History', 'Transaction history will be available soon!');
  };

  const handleViewAllAchievements = () => {
    Alert.alert('All Achievements', 'View all achievements feature will be available soon!');
  };

  const handleCounselorBook = (bookingData) => {
    Alert.alert(
      'Booking Confirmed',
      `Appointment booked with ${bookingData.counselor.name} for ${bookingData.time}`
    );
    setShowCounselorBooking(false);
  };

  const handleFeePayment = (paymentData) => {
    Alert.alert(
      'Payment Successful',
      `Payment of $${paymentData.totalAmount} processed successfully`
    );
    setShowFeePayment(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <Settings
          user={user}
          onNotificationPress={handleNotificationPress}
          onSettingsPress={handleSettingsPress}
        />
        
        {/* Stats Overview */}
        <ProfileStats stats={stats} />
        
        {/* Quick Actions */}
        <QuickActions
          actions={QUICK_ACTIONS}
          onActionPress={handleQuickAction}
        />
        
        {/* Daily Habits */}
        <HabitTracker
          habits={habits}
          onToggleHabit={toggleHabit}
          completedCount={getCompletedHabitsCount()}
          totalCount={getTotalHabitsCount()}
        />
        
        {/* Campus Wallet */}
        <CampusWallet
          balance={stats.walletBalance}
          onAddFunds={handleAddFunds}
          onViewHistory={handleViewHistory}
        />
        
        {/* Achievements */}
        <Achievements
          achievements={achievements}
          onViewAll={handleViewAllAchievements}
        />
      </ScrollView>

      <CounselorBooking
        counselors={COUNSELORS}
        visible={showCounselorBooking}
        onClose={() => setShowCounselorBooking(false)}
        onBook={handleCounselorBook}
      />

      <FeePayment
        fees={OUTSTANDING_FEES}
        visible={showFeePayment}
        onClose={() => setShowFeePayment(false)}
        onPay={handleFeePayment}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
});
