import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function PriorityAlerts({ alerts }) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="notifications-active" size={18} color="#a23800" />
                <Text style={styles.title}>Priority Alerts</Text>
            </View>

            <View style={styles.alerts}>
                {alerts.map((alert) => (
                    <View key={alert.id} style={styles.alertItem}>
                        <View style={[styles.alertIcon, { backgroundColor: `${alert.color}1a` }]}>
                            <MaterialIcons name={alert.icon} size={15} color={alert.color} />
                        </View>
                        <View style={styles.alertContent}>
                            <Text style={styles.alertTitle}>{alert.title}</Text>
                            <Text style={styles.alertSubtitle}>{alert.subtitle}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    alerts: {
        gap: 12,
    },
    alertItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    alertSubtitle: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
});