import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { APPLICATION_COLORS, FILTERS } from '../constants/applicationData';

export default function SearchAndFilter({ onSearch, onFilterChange }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

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
                    color={APPLICATION_COLORS.outline}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by role or company..."
                    placeholderTextColor={APPLICATION_COLORS.onSurfaceVariant}
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
        backgroundColor: APPLICATION_COLORS.surfaceContainerLowest,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
        marginBottom: 12,
        marginHorizontal: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: APPLICATION_COLORS.onSurface,
        paddingVertical: 8,
    },
    filterContainer: {
        maxHeight: 48,
    },
    filterContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: APPLICATION_COLORS.surfaceContainerLowest,
    },
    filterChipActive: {
        backgroundColor: APPLICATION_COLORS.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: APPLICATION_COLORS.onSurfaceVariant,
    },
    filterChipTextActive: {
        color: APPLICATION_COLORS.onPrimary,
    },
});
