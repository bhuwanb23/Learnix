import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { REGISTRATION_COLORS, AGENDA_ITEMS } from '../constants/registrationData';

export default function AgendaSummary({ agenda = AGENDA_ITEMS }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>The Agenda Summary</Text>
            <View style={styles.timeline}>
                {agenda.map((item, index) => (
                    <View key={item.id} style={styles.timelineItem}>
                        {/* Timeline Line */}
                        {index < agenda.length - 1 && (
                            <View style={[styles.timelineLine, { left: 1 }]} />
                        )}
                        
                        {/* Timeline Dot */}
                        <View style={[
                            styles.timelineDot,
                            item.isActive ? styles.timelineDotActive : styles.timelineDotInactive,
                        ]} />
                        
                        {/* Content */}
                        <View style={styles.timelineContent}>
                            <Text style={[
                                styles.timeText,
                                item.isActive && styles.timeTextActive,
                            ]}>
                                {item.time}
                            </Text>
                            <Text style={styles.itemTitle}>{item.title}</Text>
                            <Text style={styles.itemDescription}>{item.description}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: REGISTRATION_COLORS.surfaceContainerLow,
        borderRadius: 12,
        padding: 16,
        gap: 14,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: REGISTRATION_COLORS.onSurface,
    },
    timeline: {
        paddingLeft: 20,
        borderLeftWidth: 2,
        borderLeftColor: REGISTRATION_COLORS.primary + '33',
        gap: 14,
    },
    timelineItem: {
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: -3,
        top: 20,
        bottom: -14,
        width: 2,
        backgroundColor: REGISTRATION_COLORS.primary + '33',
    },
    timelineDot: {
        position: 'absolute',
        left: -26,
        top: 3,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 3,
        borderColor: REGISTRATION_COLORS.surface,
    },
    timelineDotActive: {
        backgroundColor: REGISTRATION_COLORS.primary,
    },
    timelineDotInactive: {
        backgroundColor: REGISTRATION_COLORS.surfaceContainerHigh,
    },
    timelineContent: {
        gap: 3,
    },
    timeText: {
        fontSize: 10,
        fontWeight: '800',
        color: REGISTRATION_COLORS.onSurfaceVariant,
        marginBottom: 3,
    },
    timeTextActive: {
        color: REGISTRATION_COLORS.primary,
    },
    itemTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: REGISTRATION_COLORS.onSurface,
    },
    itemDescription: {
        fontSize: 11,
        color: REGISTRATION_COLORS.onSurfaceVariant,
    },
});
