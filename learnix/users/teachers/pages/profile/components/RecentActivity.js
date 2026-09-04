import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function RecentActivity({ activities, onViewAll }) {
    return (
        <View style={styles.container}>
            <View style={styles.headRow}>
                <Text style={styles.title}>Recent Activity</Text>
                <TouchableOpacity onPress={onViewAll} activeOpacity={0.85}>
                    <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.card}>
                {activities.map((item) => (
                    <View key={item.id} style={styles.row}>
                        <View style={[styles.iconWrap, { backgroundColor: `${item.color}1a` }]}>
                            <MaterialIcons name={item.icon} size={16} color={item.color} />
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.activityTitle} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={styles.time}>{item.time}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    headRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 17,
        fontWeight: '700',
        color: '#2c2f31',
    },
    viewAll: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    activityTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    time: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
});