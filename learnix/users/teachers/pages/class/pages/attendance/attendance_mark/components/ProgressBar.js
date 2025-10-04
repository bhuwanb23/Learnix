import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const ProgressBar = ({ 
  presentCount, 
  totalCount, 
  percentage 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Daily Progress</Text>
        <Text style={styles.progressValue}>
          {presentCount}/{totalCount} ({percentage}%)
        </Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${percentage}%` }]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151'
  },
  progressValue: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600'
  },
  progressBarContainer: {
    width: '100%'
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  }
});

export default ProgressBar;
