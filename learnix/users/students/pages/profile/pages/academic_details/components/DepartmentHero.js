import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ACADEMIC_COLORS } from '../constants/academicData';

export default function DepartmentHero({ data }) {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[ACADEMIC_COLORS.primary, ACADEMIC_COLORS.primaryDim]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative circle */}
                <View style={styles.decorativeCircle} />

                <View style={styles.content}>
                    <View style={styles.textSection}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{data.department}</Text>
                        </View>
                        <Text style={styles.title}>{data.program}</Text>
                        <Text style={styles.subtitle}>{data.school} · {data.class}</Text>
                    </View>

                    <View style={styles.statusCard}>
                        <Text style={styles.statusLabel}>Current Status</Text>
                        <View style={styles.semesterRow}>
                            <View style={styles.statusDot} />
                            <Text style={styles.semesterText}>Semester {data.semester}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradient: {
        padding: 20,
        minHeight: 160,
    },
    decorativeCircle: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    textSection: {
        flex: 1,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        marginBottom: 8,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: ACADEMIC_COLORS.onPrimary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: ACADEMIC_COLORS.onPrimary,
        lineHeight: 30,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(241, 242, 255, 0.8)',
    },
    statusCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: 'rgba(241, 242, 255, 0.7)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
        textAlign: 'center',
    },
    semesterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: ACADEMIC_COLORS.green,
    },
    semesterText: {
        fontSize: 16,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onPrimary,
    },
});
