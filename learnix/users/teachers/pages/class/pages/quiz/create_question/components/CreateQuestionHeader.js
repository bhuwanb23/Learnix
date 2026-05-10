import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function CreateQuestionHeader({ onBack, onPublish, onSearch }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Quiz Studio</Text>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.searchButton} onPress={onSearch} activeOpacity={0.7}>
                    <MaterialIcons name="search" size={20} color="#747779" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.publishButton} onPress={onPublish} activeOpacity={0.85}>
                    <Text style={styles.publishButtonText}>Publish</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#f5f7f9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 22,
        fontWeight: '800',
        color: '#0050d4',
        letterSpacing: -0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchButton: {
        padding: 8,
        borderRadius: 20,
    },
    publishButton: {
        backgroundColor: '#0050d4',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    publishButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
});
