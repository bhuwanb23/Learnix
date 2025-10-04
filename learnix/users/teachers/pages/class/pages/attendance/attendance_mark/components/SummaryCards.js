import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const SummaryCards = ({ 
  presentCount, 
  absentCount 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.cardsRow}>
        {/* Present Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>Present Today</Text>
                <Text style={styles.cardValue}>{presentCount}</Text>
              </View>
              <View style={styles.cardIcon}>
                <Text style={styles.iconText}>✓</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Absent Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#60A5FA', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>Absent Today</Text>
                <Text style={styles.cardValue}>{absentCount}</Text>
              </View>
              <View style={styles.cardIcon}>
                <Text style={styles.iconText}>✕</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12
  },
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden'
  },
  cardGradient: {
    padding: 16
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardLeft: {
    flex: 1
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DBEAFE',
    marginBottom: 4
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconText: {
    fontSize: 20,
    color: '#FFFFFF'
  }
});

export default SummaryCards;
