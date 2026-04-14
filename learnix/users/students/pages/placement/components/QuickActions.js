import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuickActions({ navigation }) {
  const handleBrowseJobs = () => {
    if (navigation) {
      navigation.navigate('BrowseJobs');
    }
  };

  const handlePlacementDrives = () => {
    if (navigation) {
      navigation.navigate('PlacementDrive');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* Browse Jobs */}
        <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={handleBrowseJobs}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="work" size={24} color="#0050d4" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Browse Jobs</Text>
              <Text style={styles.cardSubtitle}>150+ Matches</Text>
            </View>
          </View>
          <MaterialIcons name="arrow-outward" size={20} color="#0050d4" style={styles.arrowIcon} />
        </TouchableOpacity>

        {/* Placement Drives */}
        {/* <TouchableOpacity style={[styles.card, styles.secondaryCard]} activeOpacity={0.95} onPress={handlePlacementDrives}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, styles.secondaryIconContainer]}>
              <MaterialIcons name="event-note" size={24} color="#702ae1" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Placement Drives</Text>
              <Text style={styles.cardSubtitle}>5 Upcoming</Text>
            </View>
          </View>
          <MaterialIcons name="arrow-outward" size={20} color="#702ae1" style={styles.arrowIcon} />
        </TouchableOpacity> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  secondaryCard: {
    // Secondary card styling
  },
  content: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryIconContainer: {
    backgroundColor: 'rgba(112, 42, 225, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    lineHeight: 22,
    marginTop: 0,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    marginTop: 4,
  },
  arrowIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});
