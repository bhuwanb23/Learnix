import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function StatsCardsRow({ stats }) {
  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: stat.bgColor }]}>
            <Text style={[styles.icon, { color: stat.color }]}>
              {getIconEmoji(stat.icon)}
            </Text>
          </View>
          <View>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const getIconEmoji = (iconName) => {
  const icons = {
    alarm: '⏰',
    check_circle: '✅',
    star: '⭐',
    pending_actions: '📋',
  };
  return icons[iconName] || '📌';
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 24,
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#eef1f3',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    marginTop: 2,
    fontFamily: 'Manrope-Bold',
  },
});
