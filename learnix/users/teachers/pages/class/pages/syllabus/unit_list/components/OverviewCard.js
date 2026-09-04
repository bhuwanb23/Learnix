import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function OverviewCard({ overview }) {
    return (
        <LinearGradient
            colors={['#0050d4', '#1e40af']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.glow} />
            <View style={styles.iconBox}>
                <MaterialIcons name="auto-stories" size={32} color="#ffffff" />
            </View>

            <View style={styles.content}>
                <View style={styles.termRow}>
                    <View style={styles.termBadge}>
                        <Text style={styles.termBadgeText}>{overview.term.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.statusText}>• {overview.status}</Text>
                </View>

                <View style={styles.percentRow}>
                    <Text style={styles.percent}>{overview.percent}%</Text>
                    <Text style={styles.percentLabel}>Overall Completed</Text>
                </View>
                <Text style={styles.caption}>{overview.caption}</Text>

                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${overview.percent}%` }]} />
                </View>
                <View style={styles.progressFooter}>
                    <Text style={styles.progressFooterText}>{overview.unitProgress}</Text>
                    <Text style={styles.progressFooterText}>{overview.lecturesRemaining}</Text>
                </View>

                <View style={styles.statsRow}>
                    {overview.stats.map((stat) => (
                        <View key={stat.id} style={styles.statPill}>
                            <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
                            <Text style={[styles.statValue, { color: stat.valueColor }]}>{stat.value}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    glow: {
        position: 'absolute',
        right: -40,
        bottom: -40,
        width: 176,
        height: 176,
        borderRadius: 88,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    iconBox: {
        position: 'absolute',
        top: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        zIndex: 1,
    },
    termRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    termBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    termBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 1,
    },
    statusText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    percentRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 10,
        marginBottom: 4,
    },
    percent: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 40,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: -1,
    },
    percentLabel: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    caption: {
        fontFamily: 'Manrope',
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 14,
    },
    progressTrack: {
        height: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 9999,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 9999,
    },
    progressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    progressFooterText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.75)',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.15)',
        paddingTop: 16,
    },
    statPill: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    statLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.7)',
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 13,
        fontWeight: '700',
    },
});
