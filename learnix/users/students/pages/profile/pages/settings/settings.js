import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SETTINGS_COLORS, USER_IDENTITY, SETTINGS_GROUPS, APP_VERSION } from './constants/settingsData';
import UserIdentityCard from './components/UserIdentityCard';
import SettingsGroup from './components/SettingsGroup';

export default function SettingsPage({ route, navigation }) {
    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleItemPress = (item) => {
        console.log('Settings item pressed:', item.id);
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive' },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This action cannot be undone. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive' },
            ]
        );
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
                        <MaterialIcons name="arrow-back" size={24} color={SETTINGS_COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Account Settings</Text>
                </View>
                <Image
                    source={{ uri: USER_IDENTITY.profilePhoto }}
                    style={styles.headerAvatar}
                />
            </View>

            {/* Main Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <UserIdentityCard user={USER_IDENTITY} />

                {/* Settings Groups */}
                {SETTINGS_GROUPS.map((group) => (
                    <SettingsGroup
                        key={group.id}
                        group={group}
                        onItemPress={handleItemPress}
                    />
                ))}

                {/* Danger Zone */}
                <View style={styles.dangerZone}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="exit-to-app" size={24} color={SETTINGS_COLORS.onSurface} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDeleteAccount}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="delete-forever" size={24} color={SETTINGS_COLORS.error} />
                        <Text style={styles.deleteText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>

                {/* App Version */}
                <View style={styles.footer}>
                    <Text style={styles.versionText}>{APP_VERSION}</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SETTINGS_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: SETTINGS_COLORS.surface,
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
        fontSize: 18,
        fontWeight: '700',
        color: SETTINGS_COLORS.primary,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: SETTINGS_COLORS.primaryContainer,
    },
    scrollView: {
        flex: 1,
        marginTop: 16,
    },
    dangerZone: {
        paddingHorizontal: 16,
        paddingTop: 24,
        gap: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: SETTINGS_COLORS.surfaceContainerHigh,
    },
    logoutText: {
        fontSize: 14,
        fontWeight: '700',
        color: SETTINGS_COLORS.onSurface,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: `${SETTINGS_COLORS.errorContainer}15`,
    },
    deleteText: {
        fontSize: 14,
        fontWeight: '700',
        color: SETTINGS_COLORS.error,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        paddingBottom: 40,
    },
    versionText: {
        fontSize: 10,
        fontWeight: '600',
        color: SETTINGS_COLORS.outlineVariant,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
});
