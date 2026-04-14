import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { REGISTRATION_COLORS, REGISTRATIONS } from './constants/registrationData';
import SearchAndFilter from './components/SearchAndFilter';
import RegistrationCard from './components/RegistrationCard';

export default function MyRegistrationPage({ route, navigation }) {
    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleSearch = (query) => {
        console.log('Search:', query);
    };

    const handleFilterChange = (filter) => {
        console.log('Filter:', filter);
    };

    const handleRegistrationPress = (registration) => {
        console.log('Registration pressed:', registration.id);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={REGISTRATION_COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Registrations</Text>
                </View>
                <View style={styles.headerRight}>
                    <MaterialIcons name="notifications" size={24} color={REGISTRATION_COLORS.onSurfaceVariant} />
                    <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0Z5QnPUIA-yDj-2aRYto9zf3t7TN_mD69MRGEkKydA5vlVZ_8yyuaNWc0FIloAscAPmBqGeSWhdocpj0D8UFgnqJT3I4nrx_RXw35PDSo2w5SVKMEDmt0xlLN1hsUVEmOpuaJgtX67luKsT96tmjB9_en6o5VH4228z7idZVFKyGzni8zfRa_Iap3D-X95zgF3XcTQPPiYmTzYGKMaj35bqO3NS1zEufES94Nb0PdvMwC8vFFT6EUK3BJQWYqsPf20AUexVclc4Y' }}
                        style={styles.headerAvatar}
                    />
                </View>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Search & Filter */}
                    <SearchAndFilter
                        onSearch={handleSearch}
                        onFilterChange={handleFilterChange}
                    />

                    {/* Registrations List */}
                    <View style={styles.list}>
                        {REGISTRATIONS.map((registration) => (
                            <RegistrationCard
                                key={registration.id}
                                registration={registration}
                                onPress={handleRegistrationPress}
                            />
                        ))}
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: REGISTRATION_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: REGISTRATION_COLORS.surface,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: REGISTRATION_COLORS.primary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingTop: 16,
    },
    list: {
        paddingHorizontal: 16,
        gap: 16,
    },
});
