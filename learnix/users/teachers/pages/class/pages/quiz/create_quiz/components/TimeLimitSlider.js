import React from 'react';
import { View, Text, StyleSheet, Slider } from 'react-native';

export default function TimeLimitSlider({ value, onValueChange, min = 5, max = 120 }) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.label}>TIME LIMIT (MINUTES)</Text>
                <Text style={styles.valueText}>{value} min</Text>
            </View>
            
            <View style={styles.sliderContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={min}
                    maximumValue={max}
                    value={value}
                    onValueChange={onValueChange}
                    minimumTrackTintColor="#0050d4"
                    maximumTrackTintColor="#d9dde0"
                    thumbTintColor="#0050d4"
                    step={5}
                />
            </View>
            
            <View style={styles.rangeLabels}>
                <Text style={styles.rangeText}>{min} min</Text>
                <Text style={styles.rangeText}>{max} min</Text>
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
    sliderContainer: {
        marginHorizontal: -10,
    },
    slider: {
        height: 40,
    },
    rangeLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    rangeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#abadaf',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
