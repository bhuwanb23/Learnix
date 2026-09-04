import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SkillsCard({ strengths, improvements }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>Skills Snapshot</Text>

            <Text style={styles.sectionLabel}>Strengths</Text>
            <View style={styles.chips}>
                {strengths.map((skill) => (
                    <View key={skill} style={[styles.chip, styles.strengthChip]}>
                        <MaterialIcons name="trending-up" size={13} color="#16a34a" />
                        <Text style={[styles.chipText, { color: '#16a34a' }]}>{skill}</Text>
                    </View>
                ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Areas to improve</Text>
            <View style={styles.chips}>
                {improvements.map((skill) => (
                    <View key={skill} style={[styles.chip, styles.improveChip]}>
                        <MaterialIcons name="trending-down" size={13} color="#b31b25" />
                        <Text style={[styles.chipText, { color: '#b31b25' }]}>{skill}</Text>
                    </View>
                ))}
            </View>
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
        marginBottom: 14,
    },
    sectionLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    strengthChip: {
        backgroundColor: '#dcfce7',
    },
    improveChip: {
        backgroundColor: '#fde3e5',
    },
    chipText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
    },
});