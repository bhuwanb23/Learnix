import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import PageHeader from '../../components/PageHeader';
import ToggleRow from './components/ToggleRow';
import { SETTINGS } from '../../constants/profileData';

export default function Settings({ route, navigation }) {
    const [toggles, setToggles] = useState(() => {
        const initial = {};
        [...SETTINGS.notifications, ...SETTINGS.privacy].forEach((item) => {
            initial[item.id] = item.checked;
        });
        return initial;
    });

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const toggle = (id) => {
        setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSecurityLogs = () => {
        Alert.alert('Security Logs', 'No unusual sign-in activity detected in the last 30 days.');
    };

    const handleDeactivate = () => {
        Alert.alert('Deactivate Account', 'This will remove your teacher profile from the portal. This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Deactivate', style: 'destructive', onPress: () => handleBack() },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <PageHeader title="Settings" subtitle="Notifications, privacy and account" onBack={handleBack} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <View style={styles.sectionHead}>
                        <MaterialIcons name="notifications" size={17} color="#0050d4" />
                        <Text style={styles.sectionTitle}>Notification Preferences</Text>
                    </View>
                    {SETTINGS.notifications.map((item) => (
                        <ToggleRow
                            key={item.id}
                            label={item.label}
                            value={Boolean(toggles[item.id])}
                            onChange={() => toggle(item.id)}
                        />
                    ))}
                </View>

                <View style={styles.card}>
                    <View style={styles.sectionHead}>
                        <MaterialIcons name="lock" size={17} color="#0050d4" />
                        <Text style={styles.sectionTitle}>Privacy & Security</Text>
                    </View>
                    {SETTINGS.privacy.map((item) => (
                        <ToggleRow
                            key={item.id}
                            label={item.label}
                            value={Boolean(toggles[item.id])}
                            onChange={() => toggle(item.id)}
                        />
                    ))}
                </View>

                <View style={styles.card}>
                    <View style={styles.sectionHead}>
                        <MaterialIcons name="security" size={17} color="#0050d4" />
                        <Text style={styles.sectionTitle}>Account</Text>
                    </View>
                    <TouchableOpacity style={styles.actionRow} onPress={handleSecurityLogs} activeOpacity={0.85}>
                        <Text style={styles.actionText}>View Security Logs</Text>
                        <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} onPress={handleDeactivate} activeOpacity={0.85}>
                        <Text style={[styles.actionText, { color: '#b31b25' }]}>Deactivate Account</Text>
                        <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
                    </TouchableOpacity>
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
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f4',
    },
    actionText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
    },
});