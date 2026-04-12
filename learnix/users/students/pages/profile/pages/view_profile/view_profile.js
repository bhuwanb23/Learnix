import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VIEW_PROFILE_COLORS, PROFILE_DATA, PROFILE_SECTIONS } from './constants/viewProfileData';
import ProfileHeroSection from './components/ProfileHeroSection';
import ProfileSection from './components/ProfileSection';

export default function ViewProfilePage({ route, navigation }) {
    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleSave = () => {
        Alert.alert('Profile Saved', 'Your profile has been updated successfully.');
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleEditPhoto = () => {
        Alert.alert('Edit Photo', 'Photo upload functionality would open here.');
    };

    const handleItemPress = (item) => {
        Alert.alert('Edit', `Edit ${item.label}`);
    };

    const handleDeactivate = () => {
        Alert.alert(
            'Deactivate Profile',
            'Are you sure you want to deactivate your academic profile?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Deactivate', style: 'destructive' },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons
                            name="arrow-back"
                            size={24}
                            color={VIEW_PROFILE_COLORS.primary}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                </View>
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Hero Profile Section */}
                <ProfileHeroSection
                    profile={PROFILE_DATA}
                    onEditPhoto={handleEditPhoto}
                />

                {/* Profile Sections */}
                {PROFILE_SECTIONS.map((section) => (
                    <ProfileSection
                        key={section.id}
                        section={section}
                        onItemPress={handleItemPress}
                    />
                ))}

                {/* Deactivate Account */}
                <View style={styles.deactivateContainer}>
                    <TouchableOpacity
                        style={styles.deactivateButton}
                        onPress={handleDeactivate}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.deactivateText}>
                            Deactivate Academic Profile
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VIEW_PROFILE_COLORS.background,
        // paddingHorizontal: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: VIEW_PROFILE_COLORS.surface,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans-Bold',
        color: VIEW_PROFILE_COLORS.onSurface,
        letterSpacing: -0.3,
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans-Bold',
        color: VIEW_PROFILE_COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    deactivateContainer: {
        paddingTop: 48,
        paddingBottom: 32,
        alignItems: 'center',
    },
    deactivateButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    deactivateText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Manrope-Bold',
        color: VIEW_PROFILE_COLORS.error,
    },
});
