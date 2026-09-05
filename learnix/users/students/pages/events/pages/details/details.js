import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import ScheduleSection from './components/ScheduleSection';
import SpeakersSection from './components/SpeakersSection';
import LocationSection from './components/LocationSection';
import BottomActionBar from './components/BottomActionBar';
import { EVENT_DETAILS_DATA } from './constants/eventDetailsData';
import EventRegistrationPage from '../registration/registration';

export default function EventDetailsScreen({ route, navigation }) {
    const [currentView, setCurrentView] = useState('details'); // 'details' or 'registration'
    const clickedEvent = route?.params?.event || {};
    const eventData = {
        ...EVENT_DETAILS_DATA,
        ...clickedEvent,
    };

    const handleBack = () => {
        if (currentView === 'registration') {
            setCurrentView('details');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleShare = () => {
        Alert.alert('Share Event', 'Sharing options for this event will open here.');
    };

    const handleRegister = () => {
        setCurrentView('registration');
    };

    // Show Registration Page
    if (currentView === 'registration') {
        return (
            <EventRegistrationPage
                navigation={{ goBack: handleBack }}
                route={{ params: { event: eventData, userEmail: 'student@academy.edu' } }}
            />
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <HeroSection event={eventData} onBack={handleBack} onShare={handleShare} />
                <AboutSection about={eventData.about} />
                <ScheduleSection schedule={eventData.schedule} />
                <SpeakersSection speakers={eventData.speakers} />
                <LocationSection location={eventData.location} />
            </ScrollView>
            <BottomActionBar registrationEnds={eventData.registrationEnds} onRegister={handleRegister} />
        </View>
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
        paddingBottom: 120,
    },
});