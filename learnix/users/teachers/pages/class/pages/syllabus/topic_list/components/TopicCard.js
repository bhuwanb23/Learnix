import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TopicCard({ topic, reorderMode, onAction }) {
    const handleAction = (actionId) => {
        onAction?.(actionId, topic);
    };

    return (
        <View style={[styles.card, topic.status === 'draft' && styles.draftCard]}>
            <View style={styles.dragColumn}>
                <MaterialIcons
                    name="drag-indicator"
                    size={22}
                    color={reorderMode ? '#0050d4' : 'rgba(89, 92, 94, 0.4)'}
                />
                <Text style={styles.dragNumber}>{topic.number}</Text>
            </View>

            <View style={styles.content}>
                {/* Status row */}
                <View style={styles.topRow}>
                    <View style={styles.statusGroup}>
                        <View style={[styles.statusBadge, { backgroundColor: topic.statusBadge.bg || 'rgba(0, 80, 212, 0.1)' }]}>
                            {topic.statusBadge.dot ? (
                                <View style={styles.dot} />
                            ) : (
                                <MaterialIcons name={topic.statusBadge.icon} size={13} color={topic.statusBadge.color} />
                            )}
                            <Text style={[styles.statusBadgeText, { color: topic.statusBadge.color }]}>
                                {topic.statusBadge.label}
                            </Text>
                        </View>
                        {topic.hours ? <Text style={styles.hoursText}>{topic.hours}</Text> : null}
                    </View>
                    <View style={styles.optionButtons}>
                        {topic.hasEdit && (
                            <TouchableOpacity style={styles.iconButton} onPress={() => handleAction('edit')} activeOpacity={0.7}>
                                <MaterialIcons name="edit" size={18} color="#595c5e" />
                            </TouchableOpacity>
                        )}
                        {topic.hasNotes && (
                            <TouchableOpacity style={styles.iconButton} onPress={() => handleAction('notes')} activeOpacity={0.7}>
                                <MaterialIcons name="menu-book" size={18} color="#595c5e" />
                            </TouchableOpacity>
                        )}
                        {topic.hasOptions && (
                            <TouchableOpacity style={styles.iconButton} onPress={() => handleAction('options')} activeOpacity={0.7}>
                                <MaterialIcons name="more-vert" size={18} color="#595c5e" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Title */}
                <Text style={[styles.title, topic.status === 'draft' && styles.draftTitle]} numberOfLines={1}>
                    {topic.title}
                </Text>

                {/* Description */}
                {topic.description ? (
                    <Text style={styles.description} numberOfLines={1}>{topic.description}</Text>
                ) : null}

                {/* Next lecture box (active/in-progress) */}
                {topic.nextLecture ? (
                    <View style={styles.nextLectureBox}>
                        <MaterialIcons name="event" size={16} color="#a23800" style={styles.nextLectureIcon} />
                        <View style={styles.nextLectureText}>
                            <Text style={styles.nextLectureTitle}>{topic.nextLecture.title}</Text>
                            <Text style={styles.nextLectureSub}>{topic.nextLecture.sub}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Flag row (scheduled) */}
                {topic.footerFlags ? (
                    <View style={styles.flagsRow}>
                        {topic.footerFlags.map((flag, index) => (
                            <View key={flag.id} style={styles.flagGroup}>
                                {index > 0 && <Text style={styles.flagSeparator}>•</Text>}
                                <MaterialIcons name={flag.icon} size={14} color={flag.alert ? '#a23800' : '#0050d4'} />
                                <Text style={[styles.flagText, flag.alert && styles.flagTextAlert]}>{flag.label}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {/* Chips (done topics) */}
                {topic.chips ? (
                    <View style={styles.chips}>
                        {topic.chips.map((chip) => (
                            <View
                                key={chip.id}
                                style={[styles.chip, chip.accent && styles.chipAccent]}
                            >
                                <MaterialIcons name={chip.icon} size={13} color={chip.accent ? '#5b00c7' : (chip.iconColor || '#595c5e')} />
                                <Text style={[styles.chipText, chip.accent && styles.chipTextAccent]}>{chip.label}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {/* Action buttons */}
                {topic.actionButtons ? (
                    <View style={styles.actionButtons}>
                        {topic.actionButtons.map((button) => {
                            if (button.variant === 'primary') {
                                return (
                                    <TouchableOpacity
                                        key={button.id}
                                        style={styles.primaryButton}
                                        onPress={() => handleAction(button.id)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.primaryButtonText}>{button.label}</Text>
                                    </TouchableOpacity>
                                );
                            }
                            if (button.variant === 'publish') {
                                return (
                                    <TouchableOpacity
                                        key={button.id}
                                        style={styles.publishButton}
                                        onPress={() => handleAction(button.id)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.publishButtonText}>{button.label}</Text>
                                    </TouchableOpacity>
                                );
                            }
                            if (button.variant === 'tonal') {
                                return (
                                    <TouchableOpacity
                                        key={button.id}
                                        style={styles.tonalButton}
                                        onPress={() => handleAction(button.id)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.tonalButtonText}>{button.label}</Text>
                                    </TouchableOpacity>
                                );
                            }
                            if (button.variant === 'danger') {
                                return (
                                    <TouchableOpacity
                                        key={button.id}
                                        style={styles.dangerButton}
                                        onPress={() => handleAction(button.id)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.dangerButtonText}>{button.label}</Text>
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <TouchableOpacity
                                    key={button.id}
                                    style={styles.secondaryButton}
                                    onPress={() => handleAction(button.id)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.secondaryButtonText}>{button.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: 'rgba(44, 47, 49, 0.04)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 2,
    },
    draftCard: {
        backgroundColor: '#eef1f3',
    },
    dragColumn: {
        alignItems: 'center',
        gap: 2,
        paddingTop: 2,
        width: 24,
    },
    dragNumber: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#595c5e',
    },
    content: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 6,
    },
    statusGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        flexWrap: 'wrap',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    statusBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#a23800',
    },
    hoursText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    optionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    draftTitle: {
        color: 'rgba(44, 47, 49, 0.8)',
    },
    description: {
        fontFamily: 'Manrope',
        fontSize: 12,
        color: '#595c5e',
        lineHeight: 17,
        marginBottom: 10,
    },
    nextLectureBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#eef1f3',
        borderRadius: 8,
        padding: 10,
        marginTop: 4,
        marginBottom: 10,
        gap: 8,
    },
    nextLectureIcon: {
        marginTop: 1,
    },
    nextLectureText: {
        flex: 1,
    },
    nextLectureTitle: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#2c2f31',
        marginBottom: 2,
    },
    nextLectureSub: {
        fontFamily: 'Manrope',
        fontSize: 11,
        color: '#595c5e',
        lineHeight: 15,
    },
    flagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
        marginTop: 4,
    },
    flagGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    flagSeparator: {
        color: '#595c5e',
        fontSize: 12,
        marginRight: 4,
    },
    flagText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    flagTextAlert: {
        color: '#a23800',
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
        marginBottom: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#eef1f3',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    chipAccent: {
        backgroundColor: 'rgba(220, 201, 255, 0.4)',
    },
    chipText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        fontWeight: '500',
        color: '#595c5e',
    },
    chipTextAccent: {
        fontFamily: 'Manrope-Bold',
        fontWeight: '700',
        color: '#5b00c7',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 6,
    },
    primaryButton: {
        backgroundColor: '#0050d4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    primaryButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    secondaryButton: {
        backgroundColor: '#dfe3e6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    secondaryButtonText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#2c2f31',
    },
    tonalButton: {
        backgroundColor: '#eef1f3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tonalButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
    publishButton: {
        backgroundColor: '#702ae1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    publishButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#f8f0ff',
    },
    dangerButton: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
    },
    dangerButtonText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#b31b25',
    },
});
