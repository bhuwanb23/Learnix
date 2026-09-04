import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REPORT_HEADER } from '../constants/reportData';

export default function ReportHeader({ title, monthLabel, onBack, onPrevMonth, onNextMonth }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
            <View style={styles.topRow}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.85}>
                    <MaterialIcons name="arrow-back" size={22} color="#2c2f31" />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>{title || REPORT_HEADER.title}</Text>
                    <Text style={styles.subtitle}>{REPORT_HEADER.subtitle}</Text>
                </View>
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={onPrevMonth} activeOpacity={0.85}>
                        <MaterialIcons name="chevron-left" size={20} color="#595c5e" />
                    </TouchableOpacity>
                    <Text style={styles.monthLabel}>{monthLabel}</Text>
                    <TouchableOpacity onPress={onNextMonth} activeOpacity={0.85}>
                        <MaterialIcons name="chevron-right" size={20} color="#595c5e" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    titleWrap: {
        flex: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
    },
    subtitle: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        color: '#8a8f94',
        marginTop: 2,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#e5e8ec',
    },
    monthLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#2c2f31',
    },
});