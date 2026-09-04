import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function InfoSection({ title, rows }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {rows.map((row, index) => (
                <View
                    key={row.label}
                    style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
                >
                    <View style={styles.iconWrap}>
                        <MaterialIcons name={row.icon} size={16} color="#0050d4" />
                    </View>
                    <Text style={styles.label}>{row.label}</Text>
                    <Text style={styles.value} numberOfLines={1}>
                        {row.value}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f4',
    },
    iconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#e8efff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    label: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        color: '#8a8f94',
        width: 96,
    },
    value: {
        flex: 1,
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        textAlign: 'right',
    },
});