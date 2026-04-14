import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ACTIVITY_COLORS } from '../constants/activityData';

export default function QuickLookSummary({ data }) {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionLabel}>Quick Look</Text>

            <View style={styles.cardsRow}>
                {/* Main Stats Card */}
                <View style={styles.mainCard}>
                    <View>
                        <Text style={styles.mainCardLabel}>Total activities this week</Text>
                        <Text style={styles.mainCardValue}>{data.totalActivities}</Text>
                    </View>
                    <View style={styles.trendBadge}>
                        <MaterialIcons name="trending-up" size={14} color={ACTIVITY_COLORS.onPrimary} />
                        <Text style={styles.trendText}>{data.trend}</Text>
                    </View>
                </View>

                {/* Focus Hours Card */}
                <View style={styles.focusCard}>
                    <View style={styles.focusIconContainer}>
                        <MaterialIcons name="timer" size={28} color={ACTIVITY_COLORS.secondary} />
                    </View>
                    <Text style={styles.focusLabel}>Focus Hours</Text>
                    <Text style={styles.focusValue}>{data.focusHours}h</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: ACTIVITY_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 16,
    },
    cardsRow: {
        gap: 12,
        paddingHorizontal: 16,
    },
    mainCard: {
        backgroundColor: ACTIVITY_COLORS.primary,
        padding: 20,
        borderRadius: 12,
        minHeight: 120,
        justifyContent: 'space-between',
    },
    mainCardLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: ACTIVITY_COLORS.onPrimary,
        opacity: 0.8,
        marginBottom: 4,
    },
    mainCardValue: {
        fontSize: 40,
        fontWeight: '900',
        color: ACTIVITY_COLORS.onPrimary,
        letterSpacing: -1,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    trendText: {
        fontSize: 11,
        fontWeight: '600',
        color: ACTIVITY_COLORS.onPrimary,
    },
    focusCard: {
        backgroundColor: ACTIVITY_COLORS.surfaceContainerLowest,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${ACTIVITY_COLORS.outlineVariant}15`,
    },
    focusIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: `${ACTIVITY_COLORS.secondaryContainer}50`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    focusLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: ACTIVITY_COLORS.onSurfaceVariant,
        marginBottom: 4,
    },
    focusValue: {
        fontSize: 22,
        fontWeight: '800',
        color: ACTIVITY_COLORS.onSurface,
    },
});
