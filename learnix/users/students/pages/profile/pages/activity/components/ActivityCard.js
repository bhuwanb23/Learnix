import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ACTIVITY_COLORS } from '../constants/activityData';

export default function ActivityCard({ activity, isLast }) {
    const renderContent = () => {
        switch (activity.type) {
            case 'assignment':
                return (
                    <>
                        <View style={styles.cardHeader}>
                            <View style={styles.headerLeft}>
                                <Text style={[styles.typeLabel, { color: activity.iconColor }]}>
                                    {activity.type}
                                </Text>
                                <Text style={styles.title}>{activity.title}</Text>
                            </View>
                            {activity.status && (
                                <View style={[styles.statusBadge, { backgroundColor: activity.statusBg }]}>
                                    <Text style={[styles.statusText, { color: activity.statusColor }]}>
                                        {activity.status}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.description}>{activity.description}</Text>
                    </>
                );

            case 'quiz':
                return (
                    <>
                        <View style={styles.cardHeader}>
                            <View style={styles.headerLeft}>
                                <Text style={[styles.typeLabel, { color: activity.iconColor }]}>
                                    {activity.type}
                                </Text>
                                <Text style={styles.title}>{activity.title}</Text>
                            </View>
                            {activity.score && (
                                <View style={styles.scoreContainer}>
                                    <Text style={[styles.scoreValue, { color: activity.iconColor }]}>
                                        {activity.score}
                                    </Text>
                                    <Text style={styles.scoreLabel}>Score</Text>
                                </View>
                            )}
                        </View>
                        {activity.hasActions && (
                            <View style={styles.actionsRow}>
                                {activity.actions.map((action, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.actionButton,
                                            action.primary && styles.primaryActionButton,
                                            action.icon && styles.iconActionButton,
                                        ]}
                                        activeOpacity={0.7}
                                        onPress={() => Alert.alert(action.label, activity.title)}
                                    >
                                        {action.icon ? (
                                            <MaterialIcons
                                                name={action.label}
                                                size={18}
                                                color={ACTIVITY_COLORS.onSecondary}
                                            />
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.actionButtonText,
                                                    action.primary
                                                        ? styles.primaryActionText
                                                        : styles.secondaryActionText,
                                                ]}
                                            >
                                                {action.label}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                );

            case 'notes':
                return (
                    <>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.typeLabel, { color: activity.iconColor }]}>
                                {activity.type}
                            </Text>
                            <Text style={styles.title}>{activity.title}</Text>
                        </View>
                        {activity.hasImage && activity.imageUrl && (
                            <View style={styles.notesPreview}>
                                <Image
                                    source={{ uri: activity.imageUrl }}
                                    style={styles.notesImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.notesTextPreview}>
                                    <Text style={styles.notesExcerpt} numberOfLines={2}>
                                        {activity.description}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </>
                );

            case 'event':
                return (
                    <>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.typeLabel, { color: ACTIVITY_COLORS.outline }]}>
                                Upcoming Event
                            </Text>
                            <Text style={styles.title}>{activity.title}</Text>
                        </View>
                        <View style={styles.eventDetails}>
                            <View style={styles.eventDetailRow}>
                                <MaterialIcons name="location-on" size={18} color={ACTIVITY_COLORS.primary} />
                                <Text style={styles.eventDetailText}>{activity.location}</Text>
                            </View>
                            <View style={styles.eventDetailRow}>
                                <MaterialIcons name="schedule" size={18} color={ACTIVITY_COLORS.primary} />
                                <Text style={styles.eventDetailText}>{activity.time}</Text>
                            </View>
                        </View>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <View style={styles.timelineItem}>
            {/* Timeline Icon */}
            <View style={styles.timelineIcon}>
                <View style={[styles.iconContainer, { backgroundColor: activity.iconBg }]}>
                    <MaterialIcons
                        name={activity.icon}
                        size={24}
                        color={activity.iconColor}
                    />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
            </View>

            {/* Card Content */}
            <View style={styles.cardContent}>
                <View
                    style={[
                        styles.card,
                        activity.isUpcoming && styles.upcomingCard,
                        activity.isUpcoming && { borderLeftWidth: 4, borderLeftColor: activity.borderColor },
                    ]}
                >
                    {renderContent()}
                    {activity.timestamp && (
                        <Text style={styles.timestamp}>{activity.timestamp}</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    timelineItem: {
        flexDirection: 'row',
        gap: 16,
    },
    timelineIcon: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: ACTIVITY_COLORS.surfaceContainerHigh,
        marginTop: 8,
        borderRadius: 1,
    },
    cardContent: {
        flex: 1,
        marginBottom: 20,
    },
    card: {
        backgroundColor: ACTIVITY_COLORS.surfaceContainerLowest,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACTIVITY_COLORS.outlineVariant}15`,
    },
    upcomingCard: {
        borderLeftWidth: 4,
        borderLeftColor: ACTIVITY_COLORS.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    headerLeft: {
        flex: 1,
    },
    typeLabel: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: ACTIVITY_COLORS.onSurface,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    description: {
        fontSize: 13,
        color: ACTIVITY_COLORS.onSurfaceVariant,
        marginBottom: 12,
        lineHeight: 18,
    },
    scoreContainer: {
        alignItems: 'flex-end',
    },
    scoreValue: {
        fontSize: 24,
        fontWeight: '900',
    },
    scoreLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: ACTIVITY_COLORS.outline,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ACTIVITY_COLORS.surfaceContainerHigh,
    },
    primaryActionButton: {
        backgroundColor: ACTIVITY_COLORS.secondary,
    },
    iconActionButton: {
        flex: 0,
        paddingHorizontal: 12,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    primaryActionText: {
        color: ACTIVITY_COLORS.onSecondary,
    },
    secondaryActionText: {
        color: ACTIVITY_COLORS.onSurface,
    },
    notesPreview: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    notesImage: {
        width: 100,
        height: 60,
        borderRadius: 8,
    },
    notesTextPreview: {
        flex: 1,
        backgroundColor: ACTIVITY_COLORS.surfaceContainerLow,
        borderRadius: 8,
        padding: 10,
        justifyContent: 'center',
    },
    notesExcerpt: {
        fontSize: 10,
        color: ACTIVITY_COLORS.onSurfaceVariant,
        fontStyle: 'italic',
        lineHeight: 14,
    },
    eventDetails: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
    },
    eventDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventDetailText: {
        fontSize: 12,
        color: ACTIVITY_COLORS.onSurfaceVariant,
        fontWeight: '600',
    },
    timestamp: {
        fontSize: 10,
        fontWeight: '600',
        color: ACTIVITY_COLORS.outline,
        marginTop: 8,
    },
});
