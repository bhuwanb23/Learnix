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
                <MaterialIcons name={subject.icon} size={28} color={subject.iconColor} />
            </View>

            {/* Subject Info */}
            <View style={styles.info}>
                <Text style={styles.name}>{subject.name}</Text>
                <Text style={styles.details}>Course Code: {subject.code} • {subject.professor}</Text>
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

                <MaterialIcons name="chevron-right" size={24} color={ACADEMIC_COLORS.onSurfaceVariant} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLowest,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACADEMIC_COLORS.outlineVariant}10`,
        gap: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
        marginBottom: 4,
    },
    details: {
        fontSize: 12,
        color: ACADEMIC_COLORS.onSurfaceVariant,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
    },
    gradeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    gradeText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
