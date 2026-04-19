import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PriorityAlerts({ alerts }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <View style={styles.icon} />
        </View>
        <Text style={styles.title}>Priority Alerts</Text>
      </View>

      <View style={styles.alerts}>
        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertItem}>
            <View style={[styles.alertDot, { backgroundColor: alert.color }]} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertSubtitle}>{alert.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
    marginBottom: 16,
  },
  iconContainer: {
    position: 'relative',
  },
  icon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a23800',
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  alerts: {
    gap: 16,
  },
  alertItem: {
    flexDirection: 'row',
    gap: 12,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 2,
  },
  alertSubtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: '#595c5e',
  },
});
