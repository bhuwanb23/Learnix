import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DeadlineChart({ data }) {
  const { width } = Dimensions.get('window');
  const cardWidth = width - 32; // Account for padding
  const barWidth = (cardWidth - 40) / data.series.length - 8; // Dynamic bar width
  
  const max = Math.max(...data.series, 15);
  
  return (
    <View style={styles.card}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Upcoming Deadlines</Text>
        <Text style={styles.subtitle}>Next 7 days</Text>
      </View>
      
      <View style={styles.graph}>
        {data.series.map((value, idx) => {
          const height = Math.max((value / max) * 120, 8); // Minimum height of 8
          return (
            <View key={idx} style={styles.barWrap}>
              <View style={styles.barContainer}>
                <LinearGradient
                  colors={['#3B82F6', '#2563eb', '#1d4ed8']}
                  style={[styles.bar, { height, width: barWidth }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <Text style={styles.valueText}>{value}</Text>
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {data.labels[idx]}
              </Text>
            </View>
          );
        })}
      </View>
      
      <View style={styles.footer}>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Assignments</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#1d4ed8' }]} />
          <Text style={styles.legendText}>Exams</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerContainer: {
    marginBottom: 16,
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    fontFamily: 'Inter-Medium',
  },
  graph: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  barWrap: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
    marginBottom: 8,
  },
  bar: {
    borderRadius: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  valueText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
    fontFamily: 'Inter-SemiBold',
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    maxWidth: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
  },
});


