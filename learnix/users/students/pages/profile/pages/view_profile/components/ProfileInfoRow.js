import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VIEW_PROFILE_COLORS } from '../constants/viewProfileData';

export default function ProfileInfoRow({ item, onPress }) {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                <Text style={styles.label}>{item.label}</Text>
                {item.isMultiline ? (
                    <Text style={[styles.value, styles.multilineValue]} numberOfLines={2}>
                        {item.value}
                    </Text>
                ) : (
                    <Text style={styles.value} numberOfLines={1}>{item.value}</Text>
                )}
            </View>
            {item.icon ? (
                <MaterialIcons
                    name={item.icon}
                    size={20}
                    color={VIEW_PROFILE_COLORS.outline}
                />
            ) : (
                <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={VIEW_PROFILE_COLORS.outline}
                />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: VIEW_PROFILE_COLORS.surfaceContainerLowest,
    },
    content: {
        flex: 1,
        paddingRight: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        color: VIEW_PROFILE_COLORS.outline,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    value: {
        fontSize: 15,
        fontWeight: '600',
        color: VIEW_PROFILE_COLORS.onSurface,
        fontFamily: 'Manrope-SemiBold',
    },
    multilineValue: {
        lineHeight: 20,
    },
});
