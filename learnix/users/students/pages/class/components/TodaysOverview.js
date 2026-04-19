import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

export default function TodaysOverview({ liveClass }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 420;
  const isTablet = width >= 768;
  const pad = isCompact ? 20 : isTablet ? 28 : 24;
  const subjectSize = STUDENT_HOME_FONT.heroTitle;
  const joinIconSize = isCompact ? 18 : 20;
  const materialsIconSize = isCompact ? 22 : 24;

  return (
    <LinearGradient
      colors={['#0050d4', '#0046bb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { padding: pad }]}
    >
      <View style={styles.bgShape} />

      <View style={styles.content}>
        <View style={styles.infoSection}>
          <View style={styles.badge}>
            <View style={styles.liveDot} />
            <Text style={styles.badgeText}>{liveClass.status}</Text>
          </View>
          <Text
            style={[styles.subjectName, { fontSize: subjectSize, lineHeight: Math.round(subjectSize * 1.15) }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {liveClass.subject}
          </Text>
          <View style={styles.detailsContainer}>
            <MaterialIcons name="person-outline" size={16} color="rgba(255, 255, 255, 0.85)" />
            <Text style={[styles.details, isCompact && styles.detailsCompact]} numberOfLines={2}>
              {liveClass.professor} • {liveClass.time}
            </Text>
          </View>
        </View>

        <View style={[styles.actionSection, isCompact && styles.actionSectionStacked]}>
          <View style={[styles.materialsBox, isCompact && styles.materialsBoxFull]}>
            <View style={styles.materialsIconWrap}>
              <MaterialIcons name="menu-book" size={materialsIconSize} color="rgba(255, 255, 255, 0.95)" />
            </View>
            <View style={styles.materialsTextCol}>
              <Text style={styles.materialsCount}>{liveClass.materials}</Text>
              <Text style={styles.materialsLabel}>Materials</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.joinButton, isCompact && styles.joinButtonFull]}
            activeOpacity={0.8}
          >
            <View style={styles.joinIconCircle}>
              <MaterialIcons name="videocam" size={joinIconSize} color="#0050d4" />
            </View>
            <Text style={[styles.joinButtonText, isCompact && styles.joinButtonTextCompact]} numberOfLines={1}>
              Join Session
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  bgShape: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'column',
    gap: 20,
  },
  infoSection: {},
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 10,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Manrope-Bold',
  },
  subjectName: {
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '100%',
  },
  details: {
    flex: 1,
    fontSize: STUDENT_HOME_FONT.heroSubtitle,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    lineHeight: 22,
  },
  detailsCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  actionSectionStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  materialsBox: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 118,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  materialsBoxFull: {
    width: '100%',
    minWidth: undefined,
    alignSelf: 'stretch',
  },
  materialsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialsTextCol: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 44,
  },
  materialsCount: {
    fontSize: STUDENT_HOME_FONT.bigStat,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans-Bold',
    lineHeight: 26,
  },
  materialsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Manrope-Bold',
    marginTop: 2,
  },
  joinButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  joinButtonFull: {
    width: '100%',
    flex: undefined,
    minHeight: 52,
  },
  joinIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    flexShrink: 1,
    fontSize: STUDENT_HOME_FONT.emphasis,
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'Manrope-Bold',
  },
  joinButtonTextCompact: {
    fontSize: 14,
  },
});
