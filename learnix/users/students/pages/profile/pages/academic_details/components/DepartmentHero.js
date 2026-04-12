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
                {/* Decorative circle - moved behind content */}
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
        padding: 16,
    },
    decorativeCircle: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        zIndex: 0,
    },
    content: {
        flexDirection: 'column',
        gap: 12,
    },
    textSection: {
        zIndex: 1,
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
        fontSize: 18,
        fontWeight: '800',
        color: ACADEMIC_COLORS.onPrimary,
        lineHeight: 24,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 11,
        color: 'rgba(241, 242, 255, 0.85)',
    },
    statusCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: 'rgba(241, 242, 255, 0.8)',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    semesterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#4caf50',
    },
    semesterText: {
        fontSize: 13,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onPrimary,
    },
});
