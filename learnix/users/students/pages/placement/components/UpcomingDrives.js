import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const drives = [
  {
    id: '1',
    title: 'Google Career Summit 2024',
    date: '24',
    month: 'Oct',
    time: '09:00 AM',
    location: 'Main Auditorium',
    status: 'Registering Now',
    statusColor: '#8e3000',
    spots: '420 slots left',
  },
  {
    id: '2',
    title: 'Fintech Innovators Recruitment',
    date: '28',
    month: 'Oct',
    time: '11:30 AM',
    location: 'Conference Hall B',
    status: 'Invitation Only',
    statusColor: '#595c5e',
    spots: 'High Eligibility',
  },
];

export default function UpcomingDrives({ navigation }) {
  const handleDrivePress = (drive) => {
    if (navigation) {
      navigation.navigate('PlacementDrive');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Campus Drives</Text>

      <View style={styles.drivesList}>
        {drives.map((drive) => (
          <TouchableOpacity key={drive.id} style={styles.driveCard} activeOpacity={0.95} onPress={() => handleDrivePress(drive)}>
            <View style={styles.driveContent}>
              <View style={styles.dateBox}>
                <Text style={styles.monthText}>{drive.month}</Text>
                <Text style={styles.dateText}>{drive.date}</Text>
              </View>
              
              <View style={styles.driveInfo}>
                <Text style={styles.driveTitle}>{drive.title}</Text>
                <Text style={styles.driveLocation}>{drive.location} • {drive.time}</Text>
              </View>
            </View>

            <View style={styles.driveRight}>
              <View style={styles.spotsInfo}>
                <Text style={[styles.statusText, { color: drive.statusColor }]}>{drive.status}</Text>
                <Text style={styles.spotsText}>{drive.spots}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#595c5e" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 24,
  },
  drivesList: {
    gap: 16,
  },
  driveCard: {
    backgroundColor: '#eef1f3',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flex: 1,
  },
  dateBox: {
    backgroundColor: '#d9dde0',
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  monthText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0050d4',
    lineHeight: 28,
  },
  driveInfo: {
    flex: 1,
  },
  driveTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
  },
  driveLocation: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
  driveRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  spotsInfo: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  spotsText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
});
