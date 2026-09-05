import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ApplicationHeader({ onGoBack }) {
  const handleMenuPress = () => {
    Alert.alert('Options', 'Application options will appear here.');
  };

  return (
    <View style={styles.topBar}>
      <TouchableOpacity 
        style={styles.backButton} 
        activeOpacity={0.7}
        onPress={onGoBack}
      >
        <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
      </TouchableOpacity>
      <Text style={styles.title}>Application Process</Text>
      <TouchableOpacity style={styles.menuButton} activeOpacity={0.7} onPress={handleMenuPress}>
        <MaterialIcons name="more-vert" size={24} color="#595c5e" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f5f7f9',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.15)',
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
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#2c2f31',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
