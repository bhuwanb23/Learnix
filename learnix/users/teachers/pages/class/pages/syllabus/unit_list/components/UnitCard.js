import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const STATUS_COLORS = {
    completed: { badgeBg: '#d1fae5', badgeColor: '#065f46' },
    active: { badgeBg: '#dbeafe', badgeColor: '#0050d4' },
    in_progress: { badgeBg: '#fef3c7', badgeColor: '#92400e' },
    upcoming: { badgeBg: '#f1f5f9', badgeColor: '#475569' },
};

export default function UnitCard({ unit, onAction }) {
    const isLocked = unit.status === 'locked';

    const handleAction = (actionId) => {
        onAction?.(actionId, unit);
    };

    if (isLocked) {
        return (
            <View style={[styles.card, styles.lockedCard]}>
                <View style={styles.lockedRow}>
                    <View style={styles.lockedLeft}>
                        <View style={styles.lockedIcon}>
                            <MaterialIcons name="lock" size={18} color="#94a3b8" />
                        </View>
                        <View>
                            <View style={styles.lockedLabelRow}>
                                <Text style={styles.lockedLabel}>{unit.eyebrow.toUpperCase()}</Text>
                                <View style={styles.periodChip}>
                                    <Text style={styles.periodChipText}>{unit.period}</Text>
                                </View>
                            </View>
                            <Text style={styles.lockedTitle}>{unit.title}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => handleAction('more')}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="more-horiz" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const statusColors = STATUS_COLORS[unit.status] || STATUS_COLORS.upcoming;

    return (
        <View style={[styles.card, unit.status === 'active' && styles.activeCard]}>
            {/* Card header */}
            <View style={styles.cardHeader}>
                <View style={styles.titleGroup}>
                    <View style={[styles.iconBox, { backgroundColor: unit.iconBg }]}>
                        <MaterialIcons name={unit.icon} size={20} color={unit.iconColor} />
                    </View>
                    <View>
                        <Text style={[styles.unitLabel, unit.status === 'active' && styles.activeUnitLabel]}>
                            {unit.eyebrow.toUpperCase()}
                        </Text>
                        <Text style={styles.unitTitle}>{unit.title}</Text>
                    </View>
                </View>
                <View style={[styles.badge, { backgroundColor: statusColors.badgeBg }]}>
                    <Text style={[styles.badgeText, { color: statusColors.badgeColor }]}>{unit.badge?.label}</Text>
                </View>
            </View>

            {/* Description (active only) */}
            {unit.description && (
                <Text style={styles.description}>{unit.description}</Text>
            )}

            {/* Next lecture banner (in_progress with scheduled lecture) */}
            {unit.nextLecture && (
                <View style={styles.nextLectureBanner}>
                    <View style={styles.nextLectureRow}>
                        <MaterialIcons name="event-upcoming" size={20} color="#0050d4" />
                        <View style={styles.nextLectureText}>
                            <Text style={styles.nextLectureTitle}>{unit.nextLecture.title}</Text>
                            <Text style={styles.nextLectureSub}>{unit.nextLecture.sub}</Text>
                        </View>
                    </View>
                    <View style={styles.pulseDot} />
                </View>
            )}

            {/* Progress */}
            {unit.progressLabel && (
                <View style={styles.progressBlock}>
                    <View style={styles.progressLabels}>
                        <Text style={styles.progressLabel}>{unit.progressLabel}</Text>
                        <Text style={[styles.progressNote, { color: unit.progressColor }]}>{unit.progressNote}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${unit.percent}%`, backgroundColor: unit.progressColor }]} />
                    </View>
                </View>
            )}

            {/* Info row (upcoming) */}
            {unit.infoRow && (
                <View style={styles.infoRow}>
                    <View style={styles.infoRowText}>
                        <MaterialIcons name={unit.infoRow.icon} size={16} color="#702ae1" />
                        <Text style={styles.infoRowLabel}>{unit.infoRow.text}</Text>
                    </View>
                    <Text style={styles.infoRowTag}>{unit.infoRow.tag}</Text>
                </View>
            )}

            {/* Topic checklist (active expanded) */}
            {unit.checklist && (
                <View style={styles.checklist}>
                    <Text style={styles.checklistTitle}>Topic Progress</Text>
                    {unit.checklist.map((item, index) => (
                        <View key={index} style={styles.checklistItem}>
                            <View style={styles.checklistLabel}>
                                <MaterialIcons
                                    name={item.done ? 'check-circle' : 'radio-button-unchecked'}
                                    size={16}
                                    color={item.done ? '#059669' : '#0050d4'}
                                />
                                <Text style={[styles.checklistText, !item.done && styles.checklistTextPending]}>
                                    {item.label}
                                </Text>
                            </View>
                            <Text style={[styles.checklistDate, !item.done && styles.checklistDatePending]}>
                                {item.date}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
                {unit.footerMeta && (
                    <View style={styles.footerMeta}>
                        {unit.status === 'completed' && (
                            <MaterialIcons name="event-available" size={16} color="#94a3b8" />
                        )}
                        <Text style={styles.footerMetaText}>{unit.footerMeta}</Text>
                    </View>
                )}

                {/* Action buttons */}
                {unit.buttons ? (
                    <View style={styles.actionButtons}>
                        {unit.buttons.map((button) => {
                            if (button.variant === 'icon') {
                                return (
                                    <TouchableOpacity
                                        key={button.id}
                                        style={styles.iconActionButton}
                                        onPress={() => handleAction(button.id)}
                                        activeOpacity={0.8}
                                    >
                                        <MaterialIcons name={button.icon} size={18} color="#2c2f31" />
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <TouchableOpacity
                                    key={button.id}
                                    style={[
                                        styles.textActionButton,
                                        button.variant === 'primary' ? styles.primaryActionButton : styles.secondaryActionButton,
                                    ]}
                                    onPress={() => handleAction(button.id)}
                                    activeOpacity={0.85}
                                >
                                    <MaterialIcons
                                        name={button.icon}
                                        size={16}
                                        color={button.variant === 'primary' ? '#ffffff' : '#2c2f31'}
                                    />
                                    <Text
                                        style={[
                                            styles.textActionButtonLabel,
                                            button.variant === 'primary' && styles.primaryActionButtonLabel,
                                        ]}
                                    >
                                        {button.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : unit.action ? (
                    <TouchableOpacity style={styles.inlineAction} onPress={() => handleAction(unit.action.id || 'action')} activeOpacity={0.8}>
                        <Text style={styles.inlineActionText}>{unit.action.label}</Text>
                        <MaterialIcons name={unit.action.icon} size={16} color="#0050d4" />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: 'rgba(15, 23, 42, 0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 2,
    },
    activeCard: {
        borderWidth: 2,
        borderColor: 'rgba(0, 80, 212, 0.2)',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    lockedCard: {
        opacity: 0.75,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14,
    },
    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unitLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    activeUnitLabel: {
        color: '#0050d4',
    },
    unitTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
        lineHeight: 20,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    badgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
    },
    description: {
        fontFamily: 'Manrope',
        fontSize: 12,
        color: '#595c5e',
        lineHeight: 18,
        marginBottom: 14,
    },
    nextLectureBanner: {
        backgroundColor: 'rgba(219, 234, 254, 0.5)',
        borderWidth: 1,
        borderColor: '#dbeafe',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 14,
    },
    nextLectureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    nextLectureText: {
        flex: 1,
    },
    nextLectureTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 2,
    },
    nextLectureSub: {
        fontFamily: 'Manrope',
        fontSize: 11,
        color: '#595c5e',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0050d4',
    },
    progressBlock: {
        marginBottom: 14,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    progressNote: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 9999,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 9999,
    },
    infoRow: {
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 14,
    },
    infoRowText: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    infoRowLabel: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    infoRowTag: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#702ae1',
    },
    checklist: {
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
        gap: 6,
    },
    checklistTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    checklistLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    checklistText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#334155',
        flex: 1,
    },
    checklistTextPending: {
        fontFamily: 'Manrope-Bold',
        fontWeight: '700',
        color: '#0f172a',
    },
    checklistDate: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        fontWeight: '500',
        color: '#94a3b8',
    },
    checklistDatePending: {
        fontFamily: 'Manrope-Bold',
        fontWeight: '700',
        color: '#0050d4',
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
    },
    footerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    footerMetaText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    inlineAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    inlineActionText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    textActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexShrink: 1,
    },
    primaryActionButton: {
        backgroundColor: '#0050d4',
        flex: 1,
    },
    secondaryActionButton: {
        backgroundColor: '#dfe3e6',
    },
    textActionButtonLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
    },
    primaryActionButtonLabel: {
        color: '#ffffff',
    },
    iconActionButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#dfe3e6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    lockedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    lockedIcon: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockedLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    lockedLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1.2,
    },
    periodChip: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    periodChipText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        fontWeight: '600',
        color: '#64748b',
    },
    lockedTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    moreButton: {
        padding: 6,
    },
});
