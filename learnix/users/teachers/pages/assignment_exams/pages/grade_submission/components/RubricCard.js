import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RubricCard({ rubric }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>Grading Rubric</Text>
            {rubric.map((criterion) => (
                <View key={criterion.id} style={styles.row}>
                    <View style={styles.criterionLeft}>
                        <View style={[styles.dot, { backgroundColor: criterion.color }]} />
                        <Text style={styles.criterionLabel}>{criterion.label}</Text>
                    </View>
                    <Text style={styles.weight}>{criterion.weight}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 7,
    },
    criterionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    criterionLabel: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#2c2f31',
    },
    weight: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#595c5e',
    },
});