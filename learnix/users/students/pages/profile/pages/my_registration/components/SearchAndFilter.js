import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { REGISTRATION_COLORS, FILTERS } from '../constants/registrationData';

export default function SearchAndFilter({ onSearch, onFilterChange }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('upcoming');

    const handleSearchChange = (text) => {
        setSearchQuery(text);
        onSearch && onSearch(text);
    };

    const handleFilterPress = (filterId) => {
        setActiveFilter(filterId);
        onFilterChange && onFilterChange(filterId);
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <MaterialIcons
                    name="search"
                    size={20}
                    color={REGISTRATION_COLORS.onSurfaceVariant}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search registered events..."
                    placeholderTextColor={`${REGISTRATION_COLORS.onSurfaceVariant}80`}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                />
            </View>

            {/* Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                {FILTERS.map((filter) => (
                    <TouchableOpacity
                        key={filter.id}
                        style={[
                            styles.filterChip,
                            activeFilter === filter.id && styles.filterChipActive,
                        ]}
                        onPress={() => handleFilterPress(filter.id)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                activeFilter === filter.id && styles.filterChipTextActive,
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: REGISTRATION_COLORS.surfaceContainerLowest,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: REGISTRATION_COLORS.onSurface,
    },
    filterContainer: {
        maxHeight: 48,
    },
    filterContent: {
        gap: 12,
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: REGISTRATION_COLORS.surfaceContainerHigh,
    },
    filterChipActive: {
        backgroundColor: REGISTRATION_COLORS.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: REGISTRATION_COLORS.onSurfaceVariant,
    },
    filterChipTextActive: {
        color: REGISTRATION_COLORS.onPrimary,
    },
});
