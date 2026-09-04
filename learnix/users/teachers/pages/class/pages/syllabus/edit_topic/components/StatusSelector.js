import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function StatusSelector({ tabs, value, onChange }) {
    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const active = value === tab.id;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, active && styles.tabActive]}
                        onPress={() => onChange(tab.id)}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.dot, { backgroundColor: tab.dotColor }]} />
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef1f3',
        borderRadius: 16,
        padding: 4,
        gap: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    tabActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    tabText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#595c5e',
        textAlign: 'center',
    },
    tabTextActive: {
        fontFamily: 'Manrope-Bold',
        fontWeight: '700',
        color: '#0050d4',
    },
});
