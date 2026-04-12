import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CONFIRMATION_COLORS } from '../constants/confirmationData';

export default function CelebrationHeader({ eventName = 'Winter Cohort' }) {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <MaterialIcons name="check-circle" size={40} color={CONFIRMATION_COLORS.onPrimary} />
            </View>
            <Text style={styles.title}>Registration Confirmed!</Text>
            <Text style={styles.subtitle}>You're officially enrolled in the {eventName}.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    iconContainer: {
        backgroundColor: CONFIRMATION_COLORS.primary,
        padding: 16,
        borderRadius: 40,
        marginBottom: 16,
        shadowColor: CONFIRMATION_COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
        elevation: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        fontFamily: 'PlusJakartaSans-Bold',
        color: CONFIRMATION_COLORS.onBackground,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: CONFIRMATION_COLORS.onSurfaceVariant,
    },
});
