import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CONFIRMATION_COLORS, NEXT_STEPS } from '../constants/confirmationData';

export default function NextSteps({ steps = NEXT_STEPS, onJoinDiscord, onDownloadFlyer }) {
    const handleAction = (stepId) => {
        if (stepId === '1' && onJoinDiscord) {
            onJoinDiscord();
        } else if (stepId === '2' && onDownloadFlyer) {
            onDownloadFlyer();
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>What's Next?</Text>
            <View style={styles.cardsContainer}>
                {steps.map((step) => (
                    <TouchableOpacity
                        key={step.id}
                        style={styles.card}
                        onPress={() => handleAction(step.id)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: step.backgroundColor }]}>
                            <MaterialIcons name={step.icon} size={24} color={step.iconColor} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>{step.title}</Text>
                            <Text style={styles.cardDescription}>{step.description}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: CONFIRMATION_COLORS.onBackground,
        paddingHorizontal: 20,
    },
    cardsContainer: {
        gap: 12,
    },
    card: {
        backgroundColor: CONFIRMATION_COLORS.surfaceContainerLow,
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
        gap: 4,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: CONFIRMATION_COLORS.onBackground,
    },
    cardDescription: {
        fontSize: 11,
        color: CONFIRMATION_COLORS.onSurfaceVariant,
    },
});
