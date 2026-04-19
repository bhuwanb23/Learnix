import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

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
    ctaLabel: 'Register now',
    ctaVariant: 'primary',
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
    ctaLabel: 'View details',
    ctaVariant: 'muted',
  },
];

export default function UpcomingDrives({ navigation }) {
  const { width } = useWindowDimensions();
  const compact = width < 420;

  const openPlacementDrives = useCallback(() => {
    navigation?.navigate?.('PlacementDrive');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Upcoming Campus Drives</Text>
        <TouchableOpacity
          onPress={openPlacementDrives}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.drivesList}>
        {drives.map((drive) => (
          <TouchableOpacity
            key={drive.id}
            style={[styles.driveCard, compact && styles.driveCardCompact]}
            activeOpacity={0.92}
            onPress={openPlacementDrives}
          >
            <View style={[styles.driveTop, compact && styles.driveTopCompact]}>
              <View style={styles.dateBox}>
                <Text style={styles.monthText}>{drive.month}</Text>
                <Text style={styles.dateText}>{drive.date}</Text>
              </View>

              <View style={styles.driveInfo}>
                <Text style={styles.driveTitle} numberOfLines={2}>
                  {drive.title}
                </Text>
                <Text style={styles.driveLocation} numberOfLines={2}>
                  {drive.location} · {drive.time}
                </Text>
              </View>
            </View>

            <View style={[styles.driveBottom, compact && styles.driveBottomCompact]}>
              <View style={[styles.spotsInfo, compact && styles.spotsInfoCompact]}>
                <Text style={[styles.statusText, { color: drive.statusColor }]}>
                  {drive.status}
                </Text>
                <Text style={styles.spotsText}>{drive.spots}</Text>
              </View>

              <View
                style={[
                  styles.ctaPill,
                  drive.ctaVariant === 'primary' ? styles.ctaPillPrimary : styles.ctaPillMuted,
                  compact && styles.ctaPillStretch,
                ]}
              >
                <Text
                  style={[
                    styles.ctaPillText,
                    drive.ctaVariant === 'primary' ? styles.ctaPillTextPrimary : styles.ctaPillTextMuted,
                  ]}
                >
                  {drive.ctaLabel}
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color={drive.ctaVariant === 'primary' ? '#ffffff' : '#2c2f31'}
                />
              </View>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: STUDENT_HOME_FONT.sectionTitle,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    minWidth: 0,
  },
  viewAll: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#0050d4',
    marginTop: 2,
  },
  drivesList: {
    gap: 16,
  },
  driveCard: {
    backgroundColor: '#eef1f3',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.22)',
  },
  driveCardCompact: {
    padding: 16,
  },
  driveTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 14,
  },
  driveTopCompact: {
    marginBottom: 12,
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
    minWidth: 0,
    justifyContent: 'center',
  },
  driveTitle: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 6,
    lineHeight: 22,
  },
  driveLocation: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 18,
  },
  driveBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  driveBottomCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  spotsInfo: {
    flex: 1,
    minWidth: 140,
    alignItems: 'flex-start',
  },
  spotsInfoCompact: {
    flexGrow: 0,
    flexShrink: 1,
    width: '100%',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  spotsText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexShrink: 0,
    minHeight: 44,
  },
  ctaPillPrimary: {
    backgroundColor: '#0050d4',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaPillMuted: {
    backgroundColor: '#dfe3e6',
  },
  ctaPillStretch: {
    alignSelf: 'stretch',
  },
  ctaPillText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
  },
  ctaPillTextPrimary: {
    color: '#ffffff',
  },
  ctaPillTextMuted: {
    color: '#2c2f31',
  },
});
