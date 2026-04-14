import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SETTINGS_COLORS } from '../constants/settingsData';

export default function UserIdentityCard({ user }) {
    return (
        <View style={styles.container}>
            <Image
                source={{ uri: user.avatar }}
                style={styles.avatar}
            />
            <View style={styles.info}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.email}>{user.email}</Text>
                <View style={styles.tierBadge}>
                    <Text style={styles.tierText}>{user.tier}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 20,
        backgroundColor: SETTINGS_COLORS.surfaceContainerLow,
        marginHorizontal: 16,
        marginBottom: 24,
        borderRadius: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: SETTINGS_COLORS.onSurface,
        marginBottom: 4,
    },
    email: {
        fontSize: 13,
        fontWeight: '500',
        color: SETTINGS_COLORS.onSurfaceVariant,
        marginBottom: 8,
    },
    tierBadge: {
        alignSelf: 'flex-start',
        backgroundColor: `${SETTINGS_COLORS.primaryContainer}30`,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tierText: {
        fontSize: 10,
        fontWeight: '700',
        color: SETTINGS_COLORS.primary,
    },
});
