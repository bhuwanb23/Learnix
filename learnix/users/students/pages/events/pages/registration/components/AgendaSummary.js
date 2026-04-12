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
        borderRadius: 16,
        padding: 24,
        gap: 20,
    },
    title: {
        fontSize: 19,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: REGISTRATION_COLORS.onSurface,
    },
    timeline: {
        paddingLeft: 24,
        borderLeftWidth: 2,
        borderLeftColor: REGISTRATION_COLORS.primary + '33',
        gap: 20,
    },
    timelineItem: {
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: -3,
        top: 24,
        bottom: -20,
        width: 2,
        backgroundColor: REGISTRATION_COLORS.primary + '33',
    },
    timelineDot: {
        position: 'absolute',
        left: -30,
        top: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 4,
        borderColor: REGISTRATION_COLORS.surface,
    },
    timelineDotActive: {
        backgroundColor: REGISTRATION_COLORS.primary,
    },
    timelineDotInactive: {
        backgroundColor: REGISTRATION_COLORS.surfaceContainerHigh,
    },
    timelineContent: {
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '800',
        color: REGISTRATION_COLORS.onSurfaceVariant,
        marginBottom: 4,
    },
    timeTextActive: {
        color: REGISTRATION_COLORS.primary,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: REGISTRATION_COLORS.onSurface,
    },
    itemDescription: {
        fontSize: 13,
        color: REGISTRATION_COLORS.onSurfaceVariant,
    },
});
