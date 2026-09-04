import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ToggleRow({ label, value, onChange }) {
    return (
        <TouchableOpacity style={styles.row} onPress={() => onChange(!value)} activeOpacity={0.7}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.track, value && styles.trackOn]}>
                <View style={[styles.thumb, value && styles.thumbOn]} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f4',
    },
    label: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        color: '#2c2f31',
        paddingRight: 12,
    },
    track: {
        width: 44,
        height: 25,
        borderRadius: 13,
        backgroundColor: '#d6dadd',
        padding: 3,
    },
    trackOn: {
        backgroundColor: '#0050d4',
    },
    thumb: {
        width: 19,
        height: 19,
        borderRadius: 10,
        backgroundColor: '#ffffff',
    },
    thumbOn: {
        transform: [{ translateX: 19 }],
    },
});