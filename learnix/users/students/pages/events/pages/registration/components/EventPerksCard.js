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
        gap: 10,
    },
    perkCard: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    perkTitle: {
        fontSize: 12,
        fontWeight: '800',
    },
    perkDescription: {
        fontSize: 10,
        lineHeight: 14,
    },
});
