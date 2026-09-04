import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function CompareBarList({ rows, onPressRow }) {
    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <Text style={styles.title}>Class Average</Text>
                <Text style={styles.hint}>Tap to view</Text>
            </View>
            {rows.map((row) => (
                <TouchableOpacity
                    key={row.key}
                    style={styles.row}
                    onPress={() => onPressRow(row)}
                    activeOpacity={0.85}
                >
                    <View style={[styles.dot, { backgroundColor: row.color }]} />
                    <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>
                            {row.name}
                        </Text>
                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: `${row.avg}%`,
                                        backgroundColor: row.avg < 70 ? '#b31b25' : row.color,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.meta}>
                            {row.total} students · {row.atRisk} at risk
                        </Text>
                    </View>
                    <View style={styles.right}>
                        <Text style={styles.avg}>{row.avg}%</Text>
                        <MaterialIcons name="chevron-right" size={18} color="#c3c7cc" />
                    </View>
                </TouchableOpacity>
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
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    headRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    hint: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f4',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    info: {
        flex: 1,
        marginRight: 10,
    },
    name: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 7,
    },
    barTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#eef1f3',
        overflow: 'hidden',
        marginBottom: 5,
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
    meta: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
    right: {
        alignItems: 'flex-end',
        gap: 4,
    },
    avg: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#2c2f31',
    },
});