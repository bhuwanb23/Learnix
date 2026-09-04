import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TopicHeader({ header, onBack, onPublish }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <MaterialIcons name="close" size={20} color="#2c2f31" />
                </TouchableOpacity>
                <View style={styles.titleBlock}>
                    <Text style={styles.eyebrow}>{header.eyebrow.toUpperCase()}</Text>
                    <Text style={styles.title} numberOfLines={1}>{header.title}</Text>
                </View>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.publishButton} onPress={onPublish} activeOpacity={0.85}>
                    <MaterialIcons name="done" size={16} color="#ffffff" />
                    <Text style={styles.publishButtonText}>Publish</Text>
                </TouchableOpacity>
                <View style={styles.avatar}>
                    <MaterialIcons name="person" size={18} color="#ffffff" />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eef1f3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleBlock: {
        flex: 1,
    },
    eyebrow: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        fontWeight: '500',
        color: '#595c5e',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#2c2f31',
        letterSpacing: -0.3,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    publishButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0050d4',
        paddingHorizontal: 16,
        height: 36,
        borderRadius: 12,
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    publishButtonText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#0050d4',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
