import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ApplicationTracker() {
  const stages = [
    {
      title: 'Applied',
      subtitle: 'Yesterday, 10:45 AM',
      icon: 'check',
      status: 'completed',
    },
    {
      title: 'Screening',
      subtitle: 'Usually takes 2-4 business days',
      icon: 'assignment',
      status: 'upcoming',
    },
    {
      title: 'Interview',
      subtitle: '',
      icon: 'groups',
      status: 'upcoming',
    },
    {
      title: 'Offer',
      subtitle: '',
      icon: 'celebration',
      status: 'upcoming',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Application Journey</Text>

      <View style={styles.trackerContainer}>
        {/* Progress Line */}
        <View style={styles.progressLine} />

        {stages.map((stage, index) => (
          <StageItem key={index} stage={stage} isLast={index === stages.length - 1} />
        ))}
      </View>
    </View>
  );
}

function StageItem({ stage, isLast }) {
  const isCompleted = stage.status === 'completed';

  return (
    <View style={[styles.stageItem, !isLast && styles.stageItemSpacing]}>
      <View style={styles.iconWrapper}>
        {isCompleted ? (
          <LinearGradient
            colors={['#0050d4', '#0046bb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.completedIcon}
          >
            <MaterialIcons name={stage.icon} size={24} color="#ffffff" />
          </LinearGradient>
        ) : (
          <View style={styles.upcomingIcon}>
            <MaterialIcons name={stage.icon} size={24} color="#abadaf" />
          </View>
        )}
      </View>

      <View style={styles.stageInfo}>
        <Text style={[styles.stageTitle, isCompleted && styles.stageTitleCompleted]}>
          {stage.title}
        </Text>
        {stage.subtitle ? (
          <Text style={styles.stageSubtitle}>{stage.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eef1f3',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#595c5e',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  trackerContainer: {
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    left: 23,
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: '#dfe3e6',
    zIndex: 0,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    position: 'relative',
    zIndex: 1,
  },
  stageItemSpacing: {
    marginBottom: 32,
  },
  iconWrapper: {
    flexShrink: 0,
  },
  completedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#dfe3e6',
  },
  stageInfo: {
    flex: 1,
    paddingTop: 12,
  },
  stageTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#595c5e',
    marginBottom: 4,
  },
  stageTitleCompleted: {
    color: '#0050d4',
  },
  stageSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#747779',
  },
});
