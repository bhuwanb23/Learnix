import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AIInsightCard({ insight, onGenerate }) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.badge}>
                    <MaterialIcons name="lightbulb" size={14} color="#ffffff" />
                    <Text style={styles.badgeText}>{insight.label}</Text>
                </View>
                <Text style={styles.title}>{insight.title}</Text>
                <Text style={styles.description}>
                    {insight.content} <Text style={styles.highlight}>{insight.highlight1}</Text> and <Text style={styles.highlight}>{insight.highlight2}</Text>. {insight.suggestion}
                </Text>
                <TouchableOpacity style={styles.button} onPress={onGenerate} activeOpacity={0.85}>
                    <Text style={styles.buttonText}>{insight.buttonText}</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.iconContainer}>
                <MaterialIcons name={insight.icon} size={48} color="#ffffff" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0050d4',
        borderRadius: 12,
        padding: 24,
        flexDirection: 'column',
        gap: 24,
        marginBottom: 32,
    },
    content: {
        zIndex: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    badgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 22,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
    },
    description: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 20,
        marginBottom: 20,
    },
    highlight: {
        fontFamily: 'Manrope-Bold',
        fontWeight: '700',
        color: '#ffffff',
    },
    button: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        alignSelf: 'flex-start',
    },
    buttonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#0050d4',
    },
    iconContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});
