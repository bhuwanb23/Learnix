import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { APPLICATION_COLORS } from '../constants/applicationData';

export default function ApplicationCard({ application, onPress }) {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress && onPress(application)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.logoContainer}>
                    <Image
                        source={{ uri: application.logo }}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
                <View style={[styles.statusBadge, { backgroundColor: application.statusBg }]}>
                    <Text style={[styles.statusText, { color: application.statusColor }]}>
                        {application.status}
                    </Text>
                </View>
            </View>

            <Text style={styles.role}>{application.role}</Text>
            <Text style={styles.company}>{application.company}</Text>

            <View style={styles.dateRow}>
                <MaterialIcons name="calendar-today" size={16} color={APPLICATION_COLORS.outline} />
                <Text style={styles.date}>{application.date}</Text>
            </View>

            <TouchableOpacity
                style={styles.viewButton}
                activeOpacity={0.7}
            >
                <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: APPLICATION_COLORS.surfaceContainerLowest,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: `${APPLICATION_COLORS.outlineVariant}15`,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    logoContainer: {
        width: 56,
        height: 56,
        backgroundColor: APPLICATION_COLORS.surfaceContainerHigh,
        borderRadius: 8,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    role: {
        fontSize: 18,
        fontWeight: '700',
        color: APPLICATION_COLORS.onSurface,
        marginBottom: 4,
        lineHeight: 22,
    },
    company: {
        fontSize: 14,
        fontWeight: '500',
        color: APPLICATION_COLORS.onSurfaceVariant,
        marginBottom: 16,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 16,
    },
    date: {
        fontSize: 13,
        color: APPLICATION_COLORS.outline,
    },
    viewButton: {
        backgroundColor: APPLICATION_COLORS.primary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    viewButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: APPLICATION_COLORS.onPrimary,
        letterSpacing: 0.5,
    },
});
