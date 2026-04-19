import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CONFIRMATION_COLORS } from './constants/confirmationData';
import CelebrationHeader from './components/CelebrationHeader';
import TicketCard from './components/TicketCard';
import NextSteps from './components/NextSteps';

export default function EventConfirmationPage({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const safeTop = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);

    const eventData = route?.params?.event || {};
    const registrationData = route?.params?.registration || {};

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleJoinDiscord = () => {
        Alert.alert('Join Discord', 'Opening Discord invite link...');
    };

    const handleDownloadFlyer = () => {
        Alert.alert('Download Flyer', 'Downloading syllabus and resources...');
    };

    const handleGoToDashboard = () => {
        // Navigate back multiple screens to reach the main dashboard
        if (navigation?.goBack) {
            navigation.goBack();
            navigation.goBack();
            navigation.goBack();
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: safeTop + 8 }]}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={20} color={CONFIRMATION_COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirmation</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Celebration Header */}
                <CelebrationHeader eventName={eventData.title || 'Winter Cohort'} />

                {/* Ticket Card */}
                <View style={styles.section}>
                    <TicketCard />
                </View>

                {/* Next Steps */}
                <View style={styles.section}>
                    <NextSteps
                        onJoinDiscord={handleJoinDiscord}
                        onDownloadFlyer={handleDownloadFlyer}
                    />
                </View>

                {/* Go to Dashboard Button */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.dashboardButton}
                        onPress={handleGoToDashboard}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[CONFIRMATION_COLORS.primary, CONFIRMATION_COLORS.primaryDim]}
                            style={styles.dashboardButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CONFIRMATION_COLORS.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: CONFIRMATION_COLORS.surface,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: CONFIRMATION_COLORS.primary,
    },
    placeholder: {
        width: 36,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    section: {
        marginBottom: 20,
    },
    dashboardButton: {
        marginHorizontal: 20,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: CONFIRMATION_COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    dashboardButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dashboardButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: CONFIRMATION_COLORS.onPrimary,
    },
});
