import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const TIME_OPTIONS = [5, 15, 30, 45, 60, 90, 120];

export default function TimeLimitSlider({ value, onValueChange }) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.label}>TIME LIMIT (MINUTES)</Text>
                <Text style={styles.valueText}>{value} min</Text>
            </View>
            
            <View style={styles.optionsContainer}>
                {TIME_OPTIONS.map((time) => (
                    <TouchableOpacity
                        key={time}
                        style={[
                            styles.timeButton,
                            value === time && styles.selectedTimeButton
                        ]}
                        onPress={() => onValueChange(time)}
                        activeOpacity={0.7}
                    >
                        <Text 
                            style={[
                                styles.timeText,
                                value === time && styles.selectedTimeText
                            ]}
                        >
                            {time}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#eef1f3',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#747779',
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    valueText: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 18,
        fontWeight: '800',
        color: '#0050d4',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    timeButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(116, 119, 121, 0.15)',
        minWidth: 60,
        alignItems: 'center',
    },
    selectedTimeButton: {
        backgroundColor: '#0050d4',
        borderColor: '#0050d4',
    },
    timeText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        color: '#595c5e',
    },
    selectedTimeText: {
        fontFamily: 'Manrope-Bold',
        color: '#ffffff',
    },
});
