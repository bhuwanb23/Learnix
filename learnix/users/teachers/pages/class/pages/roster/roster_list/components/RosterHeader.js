import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RosterHeader({ header, onBack }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
            <View style={styles.topRow}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.85}>
                    <MaterialIcons name="arrow-back" size={22} color="#2c2f31" />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>{header.title}</Text>
                    <Text style={styles.courseName} numberOfLines={1}>
                        {header.courseName}
                    </Text>
                </View>
                <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{header.code}</Text>
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
    courseName: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        color: '#595c5e',
        marginTop: 2,
    },
    codeBadge: {
        backgroundColor: '#0050d4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    codeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
});