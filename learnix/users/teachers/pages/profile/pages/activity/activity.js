import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '../../components/PageHeader';
import ActivityCard from './components/ActivityCard';
import { ACTIVITY } from '../../constants/profileData';

export default function Activity({ route, navigation }) {
    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <PageHeader
                title="Activity"
                subtitle={`${ACTIVITY.length} recent events`}
                onBack={handleBack}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    {ACTIVITY.map((item) => (
                        <ActivityCard key={item.id} item={item} />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
});