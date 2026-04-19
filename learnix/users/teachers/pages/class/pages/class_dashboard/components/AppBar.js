import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AppBar({ title, onBack }) {
    return (
        <View style={styles.appBar}>
            <View style={styles.appBarLeft}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
                </TouchableOpacity>
                <Text style={styles.appBarTitle} numberOfLines={1}>{title}</Text>
            </View>
            <View style={styles.appBarRight}>
                <View style={styles.profileImage}>
                    <MaterialIcons name="person" size={24} color="#595c5e" />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    appBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#f5f7f9',
    },
    appBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#eef1f3',
    },
    appBarTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
    },
    appBarRight: {
        marginLeft: 12,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e5e9eb',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
});
