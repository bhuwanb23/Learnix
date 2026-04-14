import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SETTINGS_COLORS } from '../constants/settingsData';

export default function SettingsGroup({ group, onItemPress }) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{group.title}</Text>
            </View>

            {group.items.map((item, index) => (
                <TouchableOpacity
                    key={item.id}
                    style={[
                        styles.item,
                        index < group.items.length - 1 && styles.itemBorder,
                    ]}
                    onPress={() => onItemPress && onItemPress(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.itemLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                            <MaterialIcons
                                name={item.icon}
                                size={24}
                                color={item.iconColor}
                            />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemLabel}>{item.label}</Text>
                            <Text style={styles.itemDescription}>{item.description}</Text>
                        </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={SETTINGS_COLORS.outlineVariant} />
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: SETTINGS_COLORS.surfaceContainerLowest,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: SETTINGS_COLORS.surfaceContainer,
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: `${SETTINGS_COLORS.onSurfaceVariant}b3`,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    itemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: SETTINGS_COLORS.surfaceContainer,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: SETTINGS_COLORS.onSurface,
        marginBottom: 2,
    },
    itemDescription: {
        fontSize: 12,
        fontWeight: '500',
        color: SETTINGS_COLORS.onSurfaceVariant,
    },
});
