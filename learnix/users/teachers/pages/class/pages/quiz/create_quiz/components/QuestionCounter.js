import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuestionCounter({ count, onIncrement, onDecrement, min = 1, max = 50 }) {
    const canDecrement = count > min;
    const canIncrement = count < max;

    return (
        <View style={styles.card}>
            <Text style={styles.label}>NUMBER OF QUESTIONS</Text>
            <View style={styles.counterContainer}>
                <TouchableOpacity 
                    style={[styles.counterButton, !canDecrement && styles.disabledButton]}
                    onPress={onDecrement}
                    disabled={!canDecrement}
                    activeOpacity={0.7}
                >
                    <MaterialIcons 
                        name="remove" 
                        size={24} 
                        color={canDecrement ? "#0050d4" : "#abadaf"} 
                    />
                </TouchableOpacity>
                
                <Text style={styles.countText}>{count}</Text>
                
                <TouchableOpacity 
                    style={[styles.counterButton, !canIncrement && styles.disabledButton]}
                    onPress={onIncrement}
                    disabled={!canIncrement}
                    activeOpacity={0.7}
                >
                    <MaterialIcons 
                        name="add" 
                        size={24} 
                        color={canIncrement ? "#0050d4" : "#abadaf"} 
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#eef1f3',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#747779',
        marginLeft: 4,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(116, 119, 121, 0.15)',
    },
    counterButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    countText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 24,
        fontWeight: '700',
        color: '#2c2f31',
    },
});
