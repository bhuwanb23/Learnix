import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ApplyFooter({ navigation, compact = false }) {
  const insets = useSafeAreaInsets();
  const handleApplyNow = () => {
    if (navigation) {
      navigation.navigate('JobApply', {});
    }
  };

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <TouchableOpacity
        style={[styles.saveButton, compact && styles.buttonFullWidth]}
        activeOpacity={0.8}
      >
        <Text style={styles.saveButtonText}>Save for Later</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.applyButton, compact && styles.buttonFullWidth]} 
        activeOpacity={0.85}
        onPress={handleApplyNow}
      >
        <LinearGradient
          colors={['#0050d4', '#0046bb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(245, 247, 249, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(171, 173, 175, 0.1)',
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  containerCompact: {
    flexDirection: 'column',
  },
  buttonFullWidth: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: '#dfe3e6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
  applyButton: {
    flex: 2,
    minHeight: 48,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#ffffff',
  },
});
