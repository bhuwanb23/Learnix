import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Switch } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { REGISTRATION_COLORS } from '../constants/registrationData';

export default function RegistrationCard({ registration, onPress }) {
    const [reminderEnabled, setReminderEnabled] = useState(registration.reminder);

    return (
        <TouchableOpacity
            style={[styles.card, registration.isCompleted && styles.completedCard]}
            activeOpacity={0.7}
            onPress={() => onPress && onPress(registration)}
        >
            <View style={styles.cardContent}>
                {/* Image */}
                <Image
                    source={{ uri: registration.image }}
                    style={[styles.image, registration.isCompleted && styles.grayscaleImage]}
                    resizeMode="cover"
                />

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View>
                            <View style={[styles.statusBadge, { backgroundColor: registration.statusBg }]}>
                                {registration.statusDot && (
                                    <View style={[styles.statusDot, { backgroundColor: registration.statusDot }]} />
                                )}
                                <Text style={[styles.statusText, { color: registration.statusColor }]}>
                                    {registration.status}
                                </Text>
                            </View>
                            <Text style={[styles.title, registration.isCompleted && styles.completedText]}>
                                {registration.title}
                            </Text>
                        </View>

                        {/* QR Code */}
                        {registration.qrCode && (
                            <View style={styles.qrContainer}>
                                <Image
                                    source={{ uri: registration.qrCode }}
                                    style={styles.qrCode}
                                    resizeMode="contain"
                                />
                            </View>
                        )}
                    </View>

                    {/* Details */}
                    <View style={styles.details}>
                        <View style={styles.detailRow}>
                            <MaterialIcons name="calendar-today" size={20} color={REGISTRATION_COLORS.primary} />
                            <Text style={[styles.detailText, registration.isCompleted && styles.completedDetailText]}>
                                {registration.date}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialIcons
                                name={registration.isCompleted ? 'history-edu' : 'location-on'}
                                size={20}
                                color={registration.isCompleted ? REGISTRATION_COLORS.onSurfaceVariant : REGISTRATION_COLORS.primary}
                            />
                            <Text style={[styles.detailText, registration.isCompleted && styles.completedDetailText]}>
                                {registration.location}
                            </Text>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        {registration.isCompleted ? (
                            <>
                                <Text style={styles.endedText}>{registration.endedText}</Text>
                                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                                    <Text style={styles.actionButtonText}>{registration.actionText}</Text>
                                    <MaterialIcons name={registration.actionIcon} size={16} color={REGISTRATION_COLORS.secondary} />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.reminderRow}>
                                    <Text style={styles.reminderLabel}>Reminder</Text>
                                    <Switch
                                        value={reminderEnabled}
                                        onValueChange={setReminderEnabled}
                                        trackColor={{
                                            false: REGISTRATION_COLORS.surfaceContainerHighest,
                                            true: REGISTRATION_COLORS.primary,
                                        }}
                                        thumbColor={REGISTRATION_COLORS.surfaceContainerLowest}
                                        ios_backgroundColor={REGISTRATION_COLORS.surfaceContainerHighest}
                                    />
                                </View>
                                <TouchableOpacity style={styles.viewDetailsButton} activeOpacity={0.7}>
                                    <Text style={styles.viewDetailsText}>View Details</Text>
                                    <MaterialIcons name="arrow-forward" size={16} color={REGISTRATION_COLORS.primary} />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: REGISTRATION_COLORS.surfaceContainerLowest,
        borderRadius: 12,
        overflow: 'hidden',
    },
    completedCard: {
        backgroundColor: `${REGISTRATION_COLORS.surfaceContainerLowest}99`,
        opacity: 0.8,
    },
    cardContent: {
        flexDirection: 'row',
    },
    image: {
        width: 120,
        height: 140,
    },
    grayscaleImage: {
        opacity: 0.6,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: REGISTRATION_COLORS.onSurface,
        lineHeight: 20,
    },
    completedText: {
        color: REGISTRATION_COLORS.onSurface,
    },
    qrContainer: {
        padding: 8,
        backgroundColor: REGISTRATION_COLORS.surfaceContainerLow,
        borderRadius: 8,
    },
    qrCode: {
        width: 48,
        height: 48,
    },
    details: {
        gap: 8,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 12,
        fontWeight: '500',
        color: REGISTRATION_COLORS.onSurfaceVariant,
    },
    completedDetailText: {
        color: `${REGISTRATION_COLORS.onSurfaceVariant}99`,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: `${REGISTRATION_COLORS.outlineVariant}15`,
    },
    reminderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reminderLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: REGISTRATION_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    viewDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewDetailsText: {
        fontSize: 13,
        fontWeight: '700',
        color: REGISTRATION_COLORS.primary,
    },
    endedText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: REGISTRATION_COLORS.onSurfaceVariant,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: REGISTRATION_COLORS.secondary,
    },
});
