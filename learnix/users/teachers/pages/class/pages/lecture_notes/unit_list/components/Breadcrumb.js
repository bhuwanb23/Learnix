import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function Breadcrumb({ items }) {
    return (
        <View style={styles.breadcrumb}>
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <Text style={[styles.breadcrumbText, item.active && styles.breadcrumbActive]}>
                        {item.label}
                    </Text>
                    {index < items.length - 1 && (
                        <MaterialIcons name="chevron-right" size={14} color="#94a3b8" />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        gap: 4,
    },
    breadcrumbText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        fontWeight: '500',
        color: '#64748b',
    },
    breadcrumbActive: {
        fontFamily: 'Manrope-Bold',
        color: '#0050d4',
        fontWeight: '700',
    },
});
