import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SlotRow({ slot, onToggle }) {
    return (
        <TouchableOpacity style={styles.row} onPress={onToggle} activeOpacity={0.85}>
            <View style={[styles.iconWrap, slot.available ? styles.iconWrapOn : styles.iconWrapOff]}>
                <MaterialIcons
                    name={slot.available ? 'event-available' : 'event-busy'}
                    size={16}
                    color={slot.available ? '#16a34a' : '#8a8f94'}
                />
            </View>
            <Text style={styles.time}>{slot.time}</Text>
            <View style={[styles.statusBadge, slot.available ? styles.statusOn : styles.statusOff]}>
                <Text style={[styles.statusText, { color: slot.available ? '#16a34a' : '#8a8f94' }]}>
                    {slot.available ? 'Available' : 'Booked'}
                </Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color="#c3c7cc" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f4',
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    iconWrapOn: {
        backgroundColor: '#dcfce7',
    },
    iconWrapOff: {
        backgroundColor: '#eef1f3',
    },
    time: {
        flex: 1,
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
    },
    statusBadge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 8,
    },
    statusOn: {
        backgroundColor: '#dcfce7',
    },
    statusOff: {
        backgroundColor: '#eef1f3',
    },
    statusText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});