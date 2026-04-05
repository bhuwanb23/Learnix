import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function TodaysOverview({ liveClass }) {
  return (
    <View style={styles.container}>
      {/* Abstract background shape */}
      <View style={styles.bgShape} />
      
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{liveClass.status}</Text>
          </View>
          <Text style={styles.subjectName}>{liveClass.subject}</Text>
          <Text style={styles.details}>
            👤 {liveClass.professor} • {liveClass.time}
          </Text>
        </View>

        <View style={styles.actionSection}>
          <View style={styles.materialsBox}>
            <Text style={styles.materialsCount}>{liveClass.materials}</Text>
            <Text style={styles.materialsLabel}>Materials</Text>
          </View>
          
          <TouchableOpacity style={styles.joinButton} activeOpacity={0.8}>
            <Text style={styles.joinButtonText}>📹 Join Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 32,
    backgroundColor: '#0050d4',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  bgShape: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  infoSection: {
    marginBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Manrope',
  },
  subjectName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 8,
  },
  details: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    fontFamily: 'Manrope',
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  materialsBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  materialsCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Plus Jakarta Sans',
  },
  materialsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    marginTop: 2,
    fontFamily: 'Manrope',
  },
  joinButton: {
    flex: 1.5,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'Plus Jakarta Sans',
  },
});
