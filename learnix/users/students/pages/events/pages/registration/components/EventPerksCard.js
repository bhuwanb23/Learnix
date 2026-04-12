import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EVENT_PERKS } from '../constants/registrationData';

export default function EventPerksCard({ perks = EVENT_PERKS }) {
    return (
        <View style={styles.container}>
            {perks.map((perk) => (
                <View
                    key={perk.id}
                    style={[styles.perkCard, { backgroundColor: perk.backgroundColor }]}
                >
                    <MaterialIcons
                        name={perk.icon}
                        size={24}
                        color={perk.iconColor}
                    />
                    <Text style={[styles.perkTitle, { color: perk.textColor }]}>
                        {perk.title}
                    </Text>
                    <Text style={[styles.perkDescription, { color: perk.descriptionColor }]}>
                        {perk.description}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
    },
    perkCard: {
        flex: 1,
        padding: 18,
        borderRadius: 16,
        gap: 10,
    },
    perkTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    perkDescription: {
        fontSize: 11,
        lineHeight: 16,
    },
});
