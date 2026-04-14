import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { APPLICATION_COLORS, APPLICATIONS, CTA_CARD } from './constants/applicationData';
import SearchAndFilter from './components/SearchAndFilter';
import ApplicationCard from './components/ApplicationCard';
import CTACard from './components/CTACard';

export default function MyApplicationPage({ route, navigation }) {
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

    const handleApplicationPress = (application) => {
        console.log('Application pressed:', application.id);
    };

    const handleBrowsePlacements = () => {
        console.log('Browse placements');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAaxW7GtSl2iO5GvACRDH9C0n1glVEVMtRNYS1bZcWSAlpsCiOXStzkY_C3dR8SfLVdIZNuef-r1VmZM4FSUKOZrOjYzBl1TUpuRjG_OAGmJQ3ZGEuiqLFHNpOXudOfAwV5n6ppYKGxZn5c3CFVE47KpQlSiOsGed14PN5spBn5PSvNY3Qrluhck-rWQEjOlWI1WpHzf9-6N8F584Q7ChoJnnNZizrXG54F-pj_MKjUIk4bg92AhqYLuwJS7wGCrnpBcxApceFhUZQ' }}
                        style={styles.headerAvatar}
                    />
                    <Text style={styles.headerTitle}>Scholar Flow</Text>
                </View>
                <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
                    <MaterialIcons name="notifications" size={24} color={APPLICATION_COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Hero Header */}
                    <View style={styles.heroSection}>
                        <Text style={styles.heroTitle}>My Applications</Text>
                        <Text style={styles.heroSubtitle}>
                            Tracking your professional journey and career milestones.
                        </Text>
                    </View>

                    {/* Search & Filter */}
                    <SearchAndFilter
                        onSearch={handleSearch}
                        onFilterChange={handleFilterChange}
                    />

                    {/* Applications Grid */}
                    <View style={styles.grid}>
                        {APPLICATIONS.map((application) => (
                            <View key={application.id} style={styles.gridItem}>
                                <ApplicationCard
                                    application={application}
                                    onPress={handleApplicationPress}
                                />
                            </View>
                        ))}

                        {/* CTA Card */}
                        <View style={styles.gridItem}>
                            <CTACard
                                data={CTA_CARD}
                                onPress={handleBrowsePlacements}
                            />
                        </View>
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
        backgroundColor: APPLICATION_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: APPLICATION_COLORS.surface,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: APPLICATION_COLORS.primary,
    },
    notificationButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingTop: 24,
    },
    heroSection: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: APPLICATION_COLORS.onSurface,
        marginBottom: 4,
    },
    heroSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: APPLICATION_COLORS.onSurfaceVariant,
    },
    grid: {
        paddingHorizontal: 16,
        gap: 16,
    },
    gridItem: {
        marginBottom: 16,
    },
});
