import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getFraudAlertStyle } from '../constants/attendanceData';

const FraudAlert = ({ 
  alert, 
  visible, 
  onDismiss 
}) => {
  if (!visible) return null;

  const alertStyle = getFraudAlertStyle(alert.type);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF7ED', '#FEF2F2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.alertGradient}
      >
        <View style={styles.alertContent}>
          <View style={styles.alertLeft}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.dismissButton} 
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    overflow: 'hidden'
  },
  alertGradient: {
    padding: 12
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12
  },
  alertIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2
  },
  alertTextContainer: {
    flex: 1
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9A3412',
    marginBottom: 4
  },
  alertMessage: {
    fontSize: 12,
    color: '#C2410C',
    lineHeight: 16
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(154, 52, 18, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  dismissIcon: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: 'bold'
  }
});

export default FraudAlert;
