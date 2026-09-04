import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuickActions({ actions, onActionPress }) {
    return (
        <View style={styles.container}>
            {actions.map((action) => (
                <TouchableOpacity
                    key={action.id}
                    style={[styles.action, action.primary ? styles.actionPrimary : styles.actionRegular]}
                    onPress={() => onActionPress(action)}
                    activeOpacity={0.85}
                >
                    <View
                        style={[
                            styles.iconWrap,
                            action.primary ? styles.iconWrapPrimary : { backgroundColor: `${action.color}1a` },
                        ]}
                    >
                        <MaterialIcons
                            name={action.icon}
                            size={20}
                            color={action.primary ? '#ffffff' : action.color}
                        />
                    </View>
                    <Text style={[styles.title, action.primary && styles.titlePrimary]} numberOfLines={1}>
                        {action.title}
                    </Text>
                    <Text style={[styles.subtitle, action.primary && styles.subtitlePrimary]} numberOfLines={2}>
                        {action.subtitle}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 10,
    },
    action: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        backgroundColor: '#ffffff',
        minHeight: 132,
    },
    actionPrimary: {
        backgroundColor: '#0050d4',
        borderColor: '#0050d4',
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 4,
    },
    actionRegular: {
        backgroundColor: '#ffffff',
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    iconWrapPrimary: {
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 3,
    },
    titlePrimary: {
        color: '#ffffff',
    },
    subtitle: {
        fontFamily: 'Manrope-Medium',
        fontSize: 10,
        color: '#8a8f94',
        lineHeight: 14,
    },
    subtitlePrimary: {
        color: 'rgba(255,255,255,0.75)',
    },
});