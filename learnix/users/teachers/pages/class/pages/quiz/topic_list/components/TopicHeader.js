import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TopicHeader({ title, unitTitle, breadcrumb, onBack }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={24} color="#2c2f31" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <View style={styles.heroBanner}>
                <View style={styles.heroOverlay}>
                    <Text style={styles.heroLabel}>Current Module</Text>
                    <Text style={styles.heroTitle}>{unitTitle}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 24,
        fontWeight: '700',
        color: '#2c2f31',
    },
    heroBanner: {
        backgroundColor: '#0050d4',
        borderRadius: 12,
        padding: 24,
        minHeight: 140,
        justifyContent: 'flex-end',
    },
    heroOverlay: {
        zIndex: 1,
    },
    heroLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(241, 242, 255, 0.8)',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    heroTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 28,
        fontWeight: '800',
        color: '#f1f2ff',
    },
});
