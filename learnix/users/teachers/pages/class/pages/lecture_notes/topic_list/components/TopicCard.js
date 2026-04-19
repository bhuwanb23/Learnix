import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TopicCard({ topic, onOpen, onEdit, onDelete }) {
    const isPrimary = topic.buttonVariant === 'primary';

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: topic.iconBg }]}>
                    <MaterialIcons name={topic.icon} size={32} color={topic.iconColor} />
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.iconButton} onPress={onEdit} activeOpacity={0.7}>
                        <MaterialIcons name="edit" size={18} color="#747779" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={onDelete} activeOpacity={0.7}>
                        <MaterialIcons name="delete" size={18} color="#b31b25" />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.topicTitle} numberOfLines={2}>{topic.title}</Text>

            <View style={styles.topicMeta}>
                <View style={styles.metaItem}>
                    <MaterialIcons name="description" size={16} color="#595c5e" />
                    <Text style={styles.metaText}>{topic.notesCount} notes</Text>
                </View>
                <View style={styles.metaItem}>
                    <MaterialIcons name="schedule" size={16} color="#595c5e" />
                    <Text style={styles.metaText}>{topic.lastUpdated}</Text>
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.openButton, isPrimary ? styles.openButtonPrimary : styles.openButtonSecondary]} 
                onPress={onOpen} 
                activeOpacity={0.85}
            >
                <Text style={[styles.openButtonText, isPrimary && styles.openButtonTextPrimary]}>
                    Open Module
                </Text>
                <MaterialIcons 
                    name="arrow-forward" 
                    size={20} 
                    color={isPrimary ? '#f1f2ff' : '#2c2f31'} 
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        padding: 24,
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
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 4,
    },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
    },
    deleteButton: {
    },
    topicTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 16,
    },
    topicMeta: {
        flexDirection: 'column',
        gap: 8,
        marginBottom: 24,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        fontWeight: '500',
        color: '#595c5e',
    },
    openButton: {
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    openButtonPrimary: {
        backgroundColor: '#0050d4',
    },
    openButtonSecondary: {
        backgroundColor: '#dfe3e6',
    },
    openButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    openButtonTextPrimary: {
        color: '#f1f2ff',
    },
});
