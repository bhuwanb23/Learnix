import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { APPLICATION_COLORS } from '../constants/applicationData';

export default function CTACard({ data, onPress }) {
    return (
        <View style={styles.card}>
            <MaterialIcons name="auto-awesome" size={48} color={APPLICATION_COLORS.onPrimary} style={styles.icon} />
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.description}>{data.description}</Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => onPress && onPress()}
                activeOpacity={0.7}
            >
                <Text style={styles.buttonText}>{data.buttonText}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: APPLICATION_COLORS.primary,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: APPLICATION_COLORS.onPrimary,
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        fontWeight: '500',
        color: APPLICATION_COLORS.onPrimary,
        opacity: 0.8,
        marginBottom: 16,
        textAlign: 'center',
    },
    button: {
        backgroundColor: APPLICATION_COLORS.surfaceContainerLowest,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    buttonText: {
        fontSize: 13,
        fontWeight: '700',
        color: APPLICATION_COLORS.primary,
    },
});
