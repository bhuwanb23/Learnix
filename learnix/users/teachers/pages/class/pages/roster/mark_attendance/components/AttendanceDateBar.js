import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AttendanceDateBar({ date, onChange, isToday }) {
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.arrowButton} onPress={() => onChange(-1)} activeOpacity={0.85}>
                <MaterialIcons name="chevron-left" size={22} color="#595c5e" />
            </TouchableOpacity>

            <View style={styles.center}>
                <View style={styles.dateRow}>
                    <MaterialIcons name="calendar-today" size={15} color="#0050d4" />
                    <Text style={styles.date}>{date}</Text>
                </View>
                {!isToday && (
                    <TouchableOpacity onPress={() => onChange(0)} activeOpacity={0.85}>
                        <Text style={styles.todayLink}>Back to today</Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity style={styles.arrowButton} onPress={() => onChange(1)} activeOpacity={0.85}>
                <MaterialIcons name="chevron-right" size={22} color="#595c5e" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e5e8ec',
    },
    arrowButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f7f9',
    },
    center: {
        alignItems: 'center',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    date: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    todayLink: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#0050d4',
        marginTop: 2,
    },
});