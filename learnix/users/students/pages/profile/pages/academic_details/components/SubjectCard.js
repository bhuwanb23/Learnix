import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ACADEMIC_COLORS } from '../constants/academicData';

export default function SubjectCard({ subject, onPress }) {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${subject.iconColor}15` }]}>
                <MaterialIcons name={subject.icon} size={24} color={subject.iconColor} />
            </View>

            {/* Subject Info */}
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{subject.name}</Text>
                <Text style={styles.details} numberOfLines={1}>Course Code: {subject.code} • {subject.professor}</Text>
            </View>

            {/* Credits & Grade */}
            <View style={styles.rightSection}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Credits</Text>
                    <Text style={styles.statValue}>{subject.credits}</Text>
                </View>

                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Grade</Text>
                    <View
                        style={[
                            styles.gradeBadge,
                            {
                                backgroundColor: subject.gradeBg,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.gradeText,
                                {
                                    color: subject.gradeColor,
                                    fontStyle: subject.isInProgress ? 'italic' : 'normal',
                                },
                            ]}
                        >
                            {subject.grade}
                        </Text>
                    </View>
                </View>

                <MaterialIcons name="chevron-right" size={20} color={ACADEMIC_COLORS.onSurfaceVariant} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLowest,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACADEMIC_COLORS.outlineVariant}20`,
        gap: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
        marginBottom: 3,
        lineHeight: 18,
    },
    details: {
        fontSize: 11,
        color: ACADEMIC_COLORS.onSurfaceVariant,
        lineHeight: 15,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
    },
    statItem: {
        alignItems: 'center',
        minWidth: 40,
    },
    statLabel: {
        fontSize: 8,
        fontWeight: '600',
        color: ACADEMIC_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 3,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
    },
    gradeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    gradeText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
