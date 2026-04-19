import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function UnitCard({ unit, onViewTopics, onEdit, onDelete }) {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>Unit {unit.unitNumber}</Text>
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.iconButton} onPress={onEdit} activeOpacity={0.7}>
                        <MaterialIcons name="edit" size={20} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={onDelete} activeOpacity={0.7}>
                        <MaterialIcons name="delete" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.unitTitle} numberOfLines={2}>{unit.title}</Text>
            <Text style={styles.unitDescription} numberOfLines={2}>{unit.description}</Text>

            <View style={styles.cardFooter}>
                <View style={styles.topicsInfo}>
                    <MaterialIcons name="menu-book" size={20} color="#7b9cff" />
                    <Text style={styles.topicsCount}>{unit.topicsCount} Topics</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: unit.statusBg }]}>
                    <Text style={[styles.statusText, { color: unit.statusColor }]}>{unit.status}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.viewButton} onPress={onViewTopics} activeOpacity={0.85}>
                <Text style={styles.viewButtonText}>View Topics</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e9eb',
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    unitBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    unitBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#0050d4',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 4,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    deleteButton: {
    },
    unitTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 8,
    },
    unitDescription: {
        fontFamily: 'Manrope',
        fontSize: 13,
        color: '#64748b',
        marginBottom: 20,
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    topicsInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    topicsCount: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
    },
    viewButton: {
        backgroundColor: '#eef1f3',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    viewButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#0050d4',
    },
});
