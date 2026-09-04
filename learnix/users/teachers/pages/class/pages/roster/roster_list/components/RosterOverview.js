import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function RosterOverview({ overview }) {
    return (
        <LinearGradient
            colors={['#0050d4', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.headRow}>
                <View style={styles.headingWrap}>
                    <Text style={styles.label}>{overview.label}</Text>
                    <Text style={styles.headline}>{overview.avgAttendance}% average attendance</Text>
                </View>
                <Text style={styles.total}>{overview.totalStudents} students</Text>
            </View>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${overview.avgAttendance}%` }]} />
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{overview.presentToday}</Text>
                    <Text style={styles.statLabel}>Present today</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{overview.absentToday}</Text>
                    <Text style={styles.statLabel}>Absent today</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{overview.atRisk}</Text>
                    <Text style={styles.statLabel}>At risk</Text>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    headRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    headingWrap: {
        flex: 1,
        paddingRight: 12,
    },
    label: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        marginBottom: 4,
    },
    headline: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
    },
    total: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.25)',
        overflow: 'hidden',
        marginBottom: 18,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#ffffff',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat: {
        flex: 1,
    },
    statValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 2,
    },
    statLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: 'rgba(255,255,255,0.75)',
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 16,
    },
});