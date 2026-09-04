import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TopicSummaryBar({ summary, saving, onAddTopic, onSaveSync }) {
    return (
        <View style={styles.bar}>
            <View style={styles.info}>
                <View style={styles.infoTitle}>
                    <MaterialIcons name={summary.icon} size={16} color="#0050d4" />
                    <Text style={styles.infoTitleText}>{summary.title}</Text>
                </View>
                <Text style={styles.infoSubtitle}>{summary.subtitle}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.addButton} onPress={onAddTopic} activeOpacity={0.85}>
                    <MaterialIcons name="add" size={16} color="#2c2f31" />
                    <Text style={styles.addButtonText}>Add Topic</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.syncButton} onPress={onSaveSync} activeOpacity={0.85}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <MaterialIcons name="sync" size={16} color="#ffffff" />
                    )}
                    <Text style={styles.syncButtonText}>{saving ? 'Syncing...' : 'Save & Sync'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        shadowColor: 'rgba(44, 47, 49, 0.12)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 32,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    info: {
        flex: 1,
    },
    infoTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    infoTitleText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
    },
    infoSubtitle: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        fontWeight: '500',
        color: '#595c5e',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#dfe3e6',
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 12,
    },
    addButtonText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#2c2f31',
    },
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0050d4',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 12,
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 4,
    },
    syncButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
});
