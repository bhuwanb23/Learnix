import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function AssignmentTabs({ tabs, activeTab, onChange }) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            {tabs.map((tab) => (
                <TouchableOpacity
                    key={tab.id}
                    style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                    onPress={() => onChange(tab.id)}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    content: {
        paddingHorizontal: 20,
        gap: 10,
    },
    tab: {
        backgroundColor: '#eef1f3',
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 20,
    },
    tabActive: {
        backgroundColor: '#0050d4',
    },
    tabText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 13,
        fontWeight: '600',
        color: '#595c5e',
    },
    tabTextActive: {
        color: '#ffffff',
    },
});