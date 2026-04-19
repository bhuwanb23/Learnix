import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ApplicationHeader({ onGoBack }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.sideSlot}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={onGoBack}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
      </View>
      <View style={styles.titleSlot}>
        <Text style={styles.title} numberOfLines={1}>
          Application Process
        </Text>
      </View>
      <View style={styles.sideSlot}>
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.7}>
          <MaterialIcons name="more-vert" size={24} color="#595c5e" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#f5f7f9',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.15)',
    minHeight: 56,
  },
  sideSlot: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSlot: {
    flex: 1,
    paddingHorizontal: 4,
    minWidth: 0,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#2c2f31',
    textAlign: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
