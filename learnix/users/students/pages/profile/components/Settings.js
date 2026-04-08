import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function Settings() {
  const supportOptions = [
    {
      id: 'help',
      title: 'Help Center',
      icon: 'help-outline',
      color: '#0050d4', // text-primary
      bgColor: 'rgba(0, 80, 212, 0.1)', // bg-primary/10
    },
    {
      id: 'it',
      title: 'IT Support',
      icon: 'computer',
      color: '#059669', // text-emerald-600
      bgColor: 'rgba(16, 185, 129, 0.1)', // bg-emerald-500/10
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Settings</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.optionsList}>
        {supportOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionCard}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.bgColor }]}>
              <MaterialIcons name={option.icon} size={20} color={option.color} />
            </View>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <MaterialIcons name="chevron-right" size={20} color="#abadaf" style={styles.chevron} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No specific container margins since handled by parent
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24, // mb-6
  },
  title: {
    fontSize: 20, // text-xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
  },
  viewAll: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#0050d4', // text-primary
    fontFamily: 'Manrope-Bold',
  },
  optionsList: {
    gap: 16, // space-y-4
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    padding: 16, // p-4
    borderRadius: 12, // rounded-xl
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1, // border
    borderColor: 'rgba(171, 173, 175, 0.1)', // border-outline-variant/10
  },
  iconContainer: {
    width: 40, // w-10
    height: 40, // h-10
    borderRadius: 8, // rounded-lg
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // mr-3
  },
  optionTitle: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'Manrope-Bold',
  },
  chevron: {
    marginLeft: 'auto',
  },
});
