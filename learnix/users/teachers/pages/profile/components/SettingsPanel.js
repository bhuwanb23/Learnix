import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SettingsPanel({ settings, activity }) {
  const [toggles, setToggles] = useState({});

  const initializeToggles = () => {
    const initial = {};
    [...settings.notifications, ...settings.privacy].forEach(item => {
      initial[item.id] = item.checked;
    });
    return initial;
  };

  const toggleSwitch = (id) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="tune" size={24} color="#595c5e" />
        <Text style={styles.title}>Integrated Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notification Preferences</Text>
        {settings.notifications.map(item => (
          <TouchableOpacity key={item.id} style={styles.toggleRow} onPress={() => toggleSwitch(item.id)} activeOpacity={0.7}>
            <Text style={styles.toggleLabel}>{item.label}</Text>
            <View style={[styles.toggle, toggles[item.id] ? styles.toggleActive : styles.toggleInactive]}>
              <View style={[styles.toggleDot, toggles[item.id] && styles.toggleDotActive]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Privacy & Security</Text>
        {settings.privacy.map(item => (
          <TouchableOpacity key={item.id} style={styles.toggleRow} onPress={() => toggleSwitch(item.id)} activeOpacity={0.7}>
            <Text style={styles.toggleLabel}>{item.label}</Text>
            <View style={[styles.toggle, toggles[item.id] ? styles.toggleActive : styles.toggleInactive]}>
              <View style={[styles.toggleDot, toggles[item.id] && styles.toggleDotActive]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.logButton} activeOpacity={0.85}>
          <Text style={styles.logButtonText}>View Security Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deactivateButton} activeOpacity={0.85}>
          <Text style={styles.deactivateButtonText}>Deactivate Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.activityTitle}>System Activity</Text>
        {activity.map(item => (
          <View key={item.id} style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: item.color }]} />
            <View>
              <Text style={styles.activityTitleText}>{item.title}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#2c2f31',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#0050d4',
  },
  toggleInactive: {
    backgroundColor: '#d9dde0',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  toggleDotActive: {
    transform: [{ translateX: 20 }],
  },
  buttons: {
    marginTop: 16,
  },
  logButton: {
    backgroundColor: '#f5f7f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  logButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
  },
  deactivateButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deactivateButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#b31b25',
  },
  activitySection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e9eb',
  },
  activityTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  activityTitleText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 2,
  },
  activityTime: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: '#595c5e',
  },
});
