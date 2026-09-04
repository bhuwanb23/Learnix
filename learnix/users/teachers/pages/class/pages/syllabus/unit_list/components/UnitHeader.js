import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function UnitHeader({ header, onBack, onExport, onSettings }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={22} color="#2c2f31" />
                </TouchableOpacity>
                <View style={styles.titleBlock}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{header.title}</Text>
                        <View style={styles.codeBadge}>
                            <Text style={styles.codeBadgeText}>{header.code}</Text>
                        </View>
                    </View>
                    <Text style={styles.subtitle} numberOfLines={1}>{header.courseName}</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconButton} onPress={onExport} activeOpacity={0.7}>
                    <MaterialIcons name="ios-share" size={20} color="#2c2f31" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={onSettings} activeOpacity={0.7}>
                    <MaterialIcons name="tune" size={20} color="#2c2f31" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eef1f3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleBlock: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: -0.3,
    },
    codeBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 9999,
    },
    codeBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#1e40af',
    },
    subtitle: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eef1f3',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
