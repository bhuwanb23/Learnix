import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Settings({ user, onNotificationPress, onSettingsPress }) {
  const settingsOptions = [
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: '3 new notifications',
      icon: 'notifications-outline',
      color: '#2563eb',
      backgroundColor: '#eff6ff',
      onPress: onNotificationPress,
    },
    {
      id: 'profile',
      title: 'Edit Profile',
      subtitle: 'Update your information',
      icon: 'person-outline',
      color: '#1d4ed8',
      backgroundColor: '#dbeafe',
      onPress: () => {},
    },
    {
      id: 'security',
      title: 'Security',
      subtitle: 'Password & privacy',
      icon: 'shield-outline',
      color: '#1e40af',
      backgroundColor: '#bfdbfe',
      onPress: () => {},
    },
    {
      id: 'preferences',
      title: 'Preferences',
      subtitle: 'App settings',
      icon: 'settings-outline',
      color: '#3b82f6',
      backgroundColor: '#e0f2fe',
      onPress: onSettingsPress,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.userSection}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userTitle}>{user.title}</Text>
          </View>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.optionsList}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionItem}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.backgroundColor }]}>
                <Ionicons name={option.icon} size={18} color={option.color} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userSection: {
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  userTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  settingsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  optionsList: {
    gap: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 4,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.1,
  },
});
