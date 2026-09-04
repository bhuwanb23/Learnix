import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function FormSection({ icon, iconBg, iconColor, title, subtitle, rightLabel, children }) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                        <MaterialIcons name={icon} size={20} color={iconColor} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    </View>
                </View>
                {rightLabel ? (
                    <View style={styles.rightLabel}>
                        <Text style={styles.rightLabelText}>{rightLabel}</Text>
                    </View>
                ) : null}
            </View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: 'rgba(0, 0, 0, 0.03)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#2c2f31',
    },
    subtitle: {
        fontFamily: 'Manrope',
        fontSize: 12,
        color: '#595c5e',
        marginTop: 1,
    },
    rightLabel: {
        backgroundColor: 'rgba(0, 80, 212, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    rightLabelText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
});
