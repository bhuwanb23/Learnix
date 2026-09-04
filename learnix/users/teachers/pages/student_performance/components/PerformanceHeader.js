import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PerformanceHeader({ header }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={24} color="#0050d4" />
          </View>
          <Text style={styles.title}>{header.title}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f7f9',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7b9cff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#0050d4',
    letterSpacing: -0.5,
  },
});
