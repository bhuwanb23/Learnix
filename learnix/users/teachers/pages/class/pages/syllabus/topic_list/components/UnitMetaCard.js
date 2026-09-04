import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function UnitMetaCard({ unit }) {
    return (
        <View style={styles.card}>
            <View style={styles.glow} />
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <View style={styles.titleBlock}>
                        <View style={styles.codePill}>
                            <MaterialIcons name="psychology" size={14} color="#5b00c7" />
                            <Text style={styles.codePillText}>{unit.code}</Text>
                        </View>
                        <Text style={styles.title}>{unit.title}</Text>
                    </View>
                    <View style={styles.statusPill}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusPillText}>{unit.statusLabel}</Text>
                    </View>
                </View>

                <View style={styles.progressSection}>
                    <View style={styles.progressTrack}>
                        <LinearGradient
                            colors={['#0050d4', '#7b9cff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${unit.percent}%` }]}
                        />
                    </View>
                    <View style={styles.progressMeta}>
                        <Text style={styles.progressMetaText}>{unit.progressLeft}</Text>
                        <Text style={styles.progressMetaValue}>{unit.progressRight}</Text>
                    </View>
                </View>

                <View style={styles.chips}>
                    {unit.chips.map((chip) => (
                        <View key={chip.id} style={styles.chip}>
                            <MaterialIcons name={chip.icon} size={15} color={chip.iconColor} />
                            <Text style={styles.chipText}>{chip.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: 'rgba(44, 47, 49, 0.06)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 3,
        position: 'relative',
        overflow: 'hidden',
    },
    glow: {
        position: 'absolute',
        right: -48,
        top: -48,
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: 'rgba(0, 80, 212, 0.05)',
    },
    content: {
        zIndex: 1,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
    },
    titleBlock: {
        flex: 1,
    },
    codePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#dcc9ff',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 9999,
        marginBottom: 6,
    },
    codePillText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 11,
        fontWeight: '600',
        color: '#5b00c7',
    },
    title: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 20,
        fontWeight: '800',
        color: '#2c2f31',
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 80, 212, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9999,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0050d4',
    },
    statusPillText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
    progressSection: {
        marginBottom: 14,
    },
    progressTrack: {
        height: 8,
        backgroundColor: '#dfe3e6',
        borderRadius: 9999,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        borderRadius: 9999,
    },
    progressMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressMetaText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    progressMetaValue: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#0050d4',
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eef1f3',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    chipText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#2c2f31',
    },
});
