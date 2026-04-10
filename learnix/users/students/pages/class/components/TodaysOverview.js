import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

export default function TodaysOverview({ liveClass }) {
  return (
    <LinearGradient
      colors={['#0050d4', '#0046bb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Abstract background shape */}
      <View style={styles.bgShape} />
      
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{liveClass.status}</Text>
          </View>
          <Text style={styles.subjectName}>{liveClass.subject}</Text>
          <View style={styles.detailsContainer}>
            <MaterialIcons name="person" size={14} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.details}>
              {liveClass.professor} • {liveClass.time}
            </Text>
          </View>
        </View>

        <View style={styles.actionSection}>
          <View style={styles.materialsBox}>
            <Text style={styles.materialsCount}>{liveClass.materials}</Text>
            <Text style={styles.materialsLabel}>Materials</Text>
          </View>
          
          <TouchableOpacity style={styles.joinButton} activeOpacity={0.8}>
            <MaterialIcons name="video-camera-front" size={20} color="#0050d4" />
            <Text style={styles.joinButtonText}>Join Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 32,
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
    flexDirection: 'column', // flex-col md:flex-row in HTML, we do col
    gap: 24,
  },
  infoSection: {
    // Info section styles
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999, // rounded-full
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12, // text-xs
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5, // tracking-wider
    fontFamily: 'Manrope-Bold',
  },
  subjectName: {
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    color: '#ffffff', // text-on-primary
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 8,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  details: {
    fontSize: 16, // Assuming base size
    color: 'rgba(255, 255, 255, 0.8)', // text-on-primary/80
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // gap-4
  },
  materialsBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // bg-white/10
    borderRadius: 12, // rounded-xl
    padding: 12,
    paddingHorizontal: 24, // px-6
    alignItems: 'center',
  },
  materialsCount: {
    fontSize: 24, // text-2xl
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Manrope-Bold',
  },
  materialsLabel: {
    fontSize: 10, // text-[10px]
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    marginTop: 0,
    fontFamily: 'Manrope-Bold',
  },
  joinButton: {
    flex: 2, // Take more space
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12, // rounded-xl
    paddingVertical: 16, // py-4
    paddingHorizontal: 32, // px-8
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16, // font-bold
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'Manrope-Bold',
  },
});
