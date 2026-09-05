import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ACTIVITY_COLORS, QUICK_LOOK, ACTIVITIES } from './constants/activityData';
import QuickLookSummary from './components/QuickLookSummary';
import ActivityCard from './components/ActivityCard';

export default function ActivityPage({ route, navigation }) {
    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleViewAll = () => {
        Alert.alert('Activity Feed', 'Your complete activity history will open here.');
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
                        <MaterialIcons name="arrow-back" size={24} color={ACTIVITY_COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Activity Feed</Text>
                </View>
                <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7} onPress={() => Alert.alert('Notifications', 'Your activity notifications will open here.')}>
                    <MaterialIcons name="notifications" size={24} color={ACTIVITY_COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <QuickLookSummary data={QUICK_LOOK} />

                {/* Recent Updates Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Updates</Text>
                        <TouchableOpacity onPress={handleViewAll} activeOpacity={0.7}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Activity Timeline */}
                    <View style={styles.timelineContainer}>
                        {ACTIVITIES.map((activity, index) => (
                            <ActivityCard
                                key={activity.id}
                                activity={activity}
                                isLast={index === ACTIVITIES.length - 1}
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
        backgroundColor: ACTIVITY_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: ACTIVITY_COLORS.surfaceContainerLow,
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
        color: ACTIVITY_COLORS.onSurface,
    },
    notificationButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: ACTIVITY_COLORS.onSurface,
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '700',
        color: ACTIVITY_COLORS.primary,
    },
    timelineContainer: {
        paddingHorizontal: 16,
    },
});
