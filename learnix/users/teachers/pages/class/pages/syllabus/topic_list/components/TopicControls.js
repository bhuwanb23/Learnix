import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TopicControls({ filters, activeFilter, reorderMode, onFilter, onReorderToggle, onAddTopic }) {
    return (
        <View style={styles.controls}>
            <View style={styles.filterGroup}>
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter.id}
                        style={[styles.filterPill, activeFilter === filter.id && styles.filterPillActive]}
                        onPress={() => onFilter(filter.id)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.filterPillText, activeFilter === filter.id && styles.filterPillTextActive]}>
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.reorderButton, reorderMode && styles.reorderButtonActive]}
                    onPress={onReorderToggle}
                    activeOpacity={0.85}
                >
                    <MaterialIcons name="swap-vert" size={16} color={reorderMode ? '#ffffff' : '#0050d4'} />
                    <Text style={[styles.reorderButtonText, reorderMode && styles.reorderButtonTextActive]}>
                        {reorderMode ? 'Exit Reorder' : 'Reorder Mode'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={onAddTopic} activeOpacity={0.85}>
                    <MaterialIcons name="add" size={16} color="#ffffff" />
                    <Text style={styles.addButtonText}>Topic</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 14,
    },
    filterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 4,
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    filterPillActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    filterPillText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#595c5e',
    },
    filterPillTextActive: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontWeight: '700',
        color: '#2c2f31',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reorderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#dfe3e6',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
    },
    reorderButtonActive: {
        backgroundColor: '#0050d4',
    },
    reorderButtonText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#2c2f31',
    },
    reorderButtonTextActive: {
        color: '#ffffff',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#0050d4',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    addButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
});
