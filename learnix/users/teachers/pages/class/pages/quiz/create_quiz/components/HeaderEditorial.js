import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HeaderEditorial({ title, subtitle }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    title: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 32,
        fontWeight: '800',
        color: '#2c2f31',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontFamily: 'Manrope',
        fontSize: 16,
        color: '#747779',
        lineHeight: 24,
    },
});
