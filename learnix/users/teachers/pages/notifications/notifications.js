import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import NotificationCard from './components/NotificationCard';
import { NOTIFICATIONS } from './constants/notificationsData';

export default function NotificationsPage({ navigation }) {
  const [items, setItems] = useState(NOTIFICATIONS);

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handlePress = (notification) => {
    // Mark as read
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, unread: false } : n)));
    Alert.alert(notification.title, notification.message, [{ text: 'OK' }]);
  };

  const handleMarkAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAll} activeOpacity={0.8}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onPress={handlePress}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e9eb',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
  },
  subtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#8a8f94',
    marginTop: 2,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
  },
  markAllText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#0050d4',
  },
});