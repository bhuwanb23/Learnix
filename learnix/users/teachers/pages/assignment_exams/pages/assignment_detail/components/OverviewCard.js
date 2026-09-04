import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function OverviewCard({ detail, dueDate, status }) {
    return (
        <View style={styles.card}>
            <Text style={styles.description}>{detail.description}</Text>

            <View style={styles.metaGrid}>
                <View style={styles.meta}>
                    <Text style={styles.metaLabel}>Points</Text>
                    <Text style={styles.metaValue}>{detail.points}</Text>
                </View>
                <View style={styles.meta}>
                    <Text style={styles.metaLabel}>Assigned</Text>
                    <Text style={styles.metaValue}>{detail.assignedDate}</Text>
                </View>
                <View style={styles.meta}>
                    <Text style={styles.metaLabel}>Due</Text>
                    <Text style={[styles.metaValue, status === 'active' && { color: '#d97706' }]}>
                        {dueDate}
                    </Text>
                </View>
            </View>

            {detail.resources.length > 0 && (
                <View style={styles.resources}>
                    <Text style={styles.sectionLabel}>Resources</Text>
                    {detail.resources.map((resource) => (
                        <View key={resource} style={styles.resourceRow}>
                            <MaterialIcons name="attach-file" size={15} color="#0050d4" />
                            <Text style={styles.resourceText}>{resource}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.instructions}>
                <Text style={styles.sectionLabel}>Instructions</Text>
                {detail.instructions.map((instruction, index) => (
                    <View key={index} style={styles.instructionRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.instructionText}>{instruction}</Text>
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
    description: {
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        lineHeight: 20,
        color: '#595c5e',
        marginBottom: 16,
    },
    metaGrid: {
        flexDirection: 'row',
        backgroundColor: '#f5f7f9',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    meta: {
        flex: 1,
        alignItems: 'center',
    },
    metaLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
        marginBottom: 3,
    },
    metaValue: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
    },
    resources: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    resourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    resourceText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#0050d4',
    },
    instructions: {},
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 4,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#0050d4',
        marginTop: 5,
    },
    instructionText: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#595c5e',
        lineHeight: 17,
    },
});