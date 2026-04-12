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
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    gradient: {
        padding: 20,
        minHeight: 140,
    },
    decorativeCircle: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 12,
    },
    textSection: {
        flex: 1,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 10,
        marginBottom: 6,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onPrimary,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: ACADEMIC_COLORS.onPrimary,
        lineHeight: 26,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: 'rgba(241, 242, 255, 0.85)',
    },
    statusCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        minWidth: 90,
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 7,
        fontWeight: '700',
        color: 'rgba(241, 242, 255, 0.8)',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
        textAlign: 'center',
    },
    semesterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4caf50',
    },
    semesterText: {
        fontSize: 14,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onPrimary,
    },
});
