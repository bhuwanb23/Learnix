import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CERTIFICATION_COLORS, SUMMARY_DATA, CERTIFICATES, FILTERS } from './constants/certificationData';
import SummaryCards from './components/SummaryCards';
import CertificateCard from './components/CertificateCard';

export default function CertificationsPage({ route, navigation }) {
    const [activeFilter, setActiveFilter] = useState('all');

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleFilterPress = (filterId) => {
        setActiveFilter(filterId);
    };

    const handleCertificatePress = (certificate) => {
        Alert.alert(certificate.title, `Issued on ${certificate.date}.`);
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
                        <MaterialIcons name="arrow-back" size={24} color={CERTIFICATION_COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Certifications</Text>
                </View>
                <View style={styles.headerRight}>
                    <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOeb9vz5bVFiZDtRiXQ3tbqxd-plMEyQIrs8bl27Pdo2JPtabxBez0bMu-e7Ei20-EdmYNsEX1ZK_2hfWwuAKb1j3LtmlZih8n9xMSDoRB5lqASbAHZ1z5d5rRvNFwgvGilmEHiqm_1m5FdBBA5RbM9w2qKh-rbjFDT48pxRpAh2-n6NRu3uJ8U0jowOPyKBo23qHWuRiO8xLAD_7iEaQ9BroLWE1-60RvVWiqcKvgIvTSPolpCNNPYHdFs7bBK9kuXWu8vHySdi0' }}
                        style={styles.headerAvatar}
                    />
                </View>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Summary Section */}
                    <SummaryCards data={SUMMARY_DATA} />

                    {/* Section Header with Filters */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Certifications</Text>
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

                    {/* Certificate Grid */}
                    <View style={styles.grid}>
                        {CERTIFICATES.map((certificate) => (
                            <CertificateCard
                                key={certificate.id}
                                certificate={certificate}
                                onPress={handleCertificatePress}
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
        backgroundColor: CERTIFICATION_COLORS.background,
        paddingHorizontal: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 12,
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
        color: CERTIFICATION_COLORS.onSurface,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: CERTIFICATION_COLORS.onSurface,
    },
    filterContainer: {
        maxHeight: 40,
    },
    filterContent: {
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: CERTIFICATION_COLORS.surfaceContainerLow,
    },
    filterChipActive: {
        backgroundColor: CERTIFICATION_COLORS.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: CERTIFICATION_COLORS.onSurfaceVariant,
    },
    filterChipTextActive: {
        color: CERTIFICATION_COLORS.onPrimary,
    },
    grid: {
        gap: 16,
    },
});
