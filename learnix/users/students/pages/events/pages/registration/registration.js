import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { REGISTRATION_COLORS } from './constants/registrationData';
import RegistrationForm from './components/RegistrationForm';
import WorkshopImage from './components/WorkshopImage';
import EventPerksCard from './components/EventPerksCard';
import AgendaSummary from './components/AgendaSummary';
import MapWidget from './components/MapWidget';
import EventConfirmationPage from '../confirmation/confirmation';

export default function EventRegistrationPage({ route, navigation }) {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const safeTop = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);
    const isDesktop = width >= 1024;
    const [currentView, setCurrentView] = useState('registration'); // 'registration' or 'confirmation'
    
    const eventData = route?.params?.event || {};
    const userEmail = route?.params?.userEmail || 'a.sterling@academy.edu';

    const handleBack = () => {
        if (currentView === 'confirmation') {
            setCurrentView('registration');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleRegistrationSubmit = (formData) => {
        console.log('Registration submitted:', formData);
        // Navigate to confirmation page
        setCurrentView('confirmation');
    };

    // Show Confirmation Page
    if (currentView === 'confirmation') {
        return (
            <EventConfirmationPage
                navigation={{ goBack: handleBack }}
                route={{ params: { event: eventData, registration: {} } }}
            />
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: safeTop + 8 }]}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={20} color={REGISTRATION_COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Event Registration</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={isDesktop ? styles.desktopContainer : null}>
                    <View style={isDesktop ? styles.contentGrid : null}>
                        {/* Left Column: Registration Form */}
                        <View style={isDesktop ? styles.leftColumn : null}>
                            {/* Event Title Section */}
                            <View style={styles.titleSection}>
                                <Text style={styles.eventSubtitle}>Immersive Workshop 2024</Text>
                                <Text style={styles.eventTitle}>
                                    {eventData.title || 'Quantum'}{' '}
                                    <Text style={styles.eventTitleHighlight}>Linguistics</Text> & AI Seminar
                                </Text>
                                <Text style={styles.eventDescription}>
                                    {eventData.description || 'Join an elite cohort of scholars exploring the intersection of neural networks and semantic theory.'}
                                </Text>
                            </View>

                            {/* Registration Form */}
                            <View style={styles.section}>
                                <RegistrationForm
                                    event={eventData}
                                    userEmail={userEmail}
                                    onSubmit={handleRegistrationSubmit}
                                />
                            </View>
                        </View>

                        {/* Right Column: Event Details */}
                        <View style={isDesktop ? styles.rightColumn : null}>
                            {/* Workshop Image */}
                            <View style={styles.section}>
                                <WorkshopImage
                                    image={eventData.image}
                                    location={eventData.location}
                                />
                            </View>

                            {/* Event Perks */}
                            <View style={styles.section}>
                                <EventPerksCard />
                            </View>

                            {/* Agenda Summary */}
                            <View style={styles.section}>
                                <AgendaSummary />
                            </View>

                            {/* Map Widget */}
                            <View style={styles.section}>
                                <MapWidget location={eventData.location} />
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: REGISTRATION_COLORS.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 12,
        backgroundColor: REGISTRATION_COLORS.surface,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: REGISTRATION_COLORS.primary,
    },
    placeholder: {
        width: 36,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    desktopContainer: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
    },
    contentGrid: {
        flexDirection: 'row',
        gap: 32,
        padding: 24,
    },
    leftColumn: {
        flex: 7,
    },
    rightColumn: {
        flex: 5,
    },
    titleSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        gap: 10,
    },
    eventSubtitle: {
        fontSize: 11,
        fontWeight: '800',
        color: REGISTRATION_COLORS.primary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    eventTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: REGISTRATION_COLORS.onSurface,
        lineHeight: 34,
        letterSpacing: -0.5,
    },
    eventTitleHighlight: {
        color: REGISTRATION_COLORS.primary,
    },
    eventDescription: {
        fontSize: 14,
        lineHeight: 20,
        color: REGISTRATION_COLORS.onSurfaceVariant,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
});
