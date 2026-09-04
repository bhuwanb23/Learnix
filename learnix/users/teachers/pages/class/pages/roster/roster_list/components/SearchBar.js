import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SearchBar({ query, onChangeQuery, sort, onToggleSort }) {
    return (
        <View style={styles.container}>
            <View style={styles.searchBox}>
                <MaterialIcons name="search" size={20} color="#8a8f94" />
                <TextInput
                    style={styles.input}
                    placeholder="Search students by name or ID"
                    placeholderTextColor="#8a8f94"
                    value={query}
                    onChangeText={onChangeQuery}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => onChangeQuery('')} activeOpacity={0.7}>
                        <MaterialIcons name="close" size={18} color="#8a8f94" />
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity style={styles.sortButton} onPress={onToggleSort} activeOpacity={0.85}>
                <MaterialIcons name="sort" size={18} color="#0050d4" />
                <Text style={styles.sortText}>{sort === 'name' ? 'Name' : 'Attendance'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 16,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 46,
        gap: 10,
        borderWidth: 1,
        borderColor: '#e5e8ec',
    },
    input: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        color: '#2c2f31',
        paddingVertical: 0,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#e8efff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 46,
    },
    sortText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
});