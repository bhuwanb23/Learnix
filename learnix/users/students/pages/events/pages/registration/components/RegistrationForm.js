import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { REGISTRATION_COLORS, LAB_TRACKS } from '../constants/registrationData';

export default function RegistrationForm({ event, userEmail, onSubmit }) {
    const [selectedTrack, setSelectedTrack] = useState(0);
    const [sendConfirmation, setSendConfirmation] = useState(true);

    const handleSubmit = () => {
        onSubmit({
            track: LAB_TRACKS[selectedTrack],
            sendConfirmation,
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <MaterialIcons name="person-add" size={24} color={REGISTRATION_COLORS.primary} />
                </View>
                <Text style={styles.title}>Quick Registration</Text>
            </View>

            <View style={styles.form}>
                {/* Name and Student ID Row */}
                <View style={styles.row}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={event?.organizer || 'Alexander Sterling'}
                            editable={false}
                            selectTextOnFocus={false}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Student ID</Text>
                        <TextInput
                            style={styles.input}
                            value={event?.id || 'U-9042231'}
                            editable={false}
                            selectTextOnFocus={false}
                        />
                    </View>
                </View>

                {/* Lab Track Selector */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Preferred Lab Track</Text>
                    <View style={styles.trackSelector}>
                        {LAB_TRACKS.map((track, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.trackOption,
                                    selectedTrack === index && styles.trackOptionSelected,
                                ]}
                                onPress={() => setSelectedTrack(index)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.trackText,
                                        selectedTrack === index && styles.trackTextSelected,
                                    ]}
                                >
                                    {track}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Confirmation Checkbox */}
                <View style={styles.checkboxRow}>
                    <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setSendConfirmation(!sendConfirmation)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, sendConfirmation && styles.checkboxChecked]}>
                            {sendConfirmation && (
                                <MaterialIcons name="check" size={16} color={REGISTRATION_COLORS.onPrimary} />
                            )}
                        </View>
                        <Text style={styles.checkboxText}>
                            Send confirmation materials to{' '}
                            <Text style={styles.emailText}>{userEmail || 'a.sterling@academy.edu'}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                >
                    <Text style={styles.submitButtonText}>Register Now</Text>
                    <MaterialIcons name="arrow-forward" size={20} color={REGISTRATION_COLORS.onPrimary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: REGISTRATION_COLORS.surfaceContainerLowest,
        borderRadius: 16,
        padding: 24,
        shadowColor: REGISTRATION_COLORS.onSurface,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 24,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    iconContainer: {
        padding: 12,
        backgroundColor: REGISTRATION_COLORS.primaryContainer + '33',
        borderRadius: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: REGISTRATION_COLORS.onSurface,
    },
    form: {
        gap: 20,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    inputGroup: {
        flex: 1,
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: REGISTRATION_COLORS.onSurfaceVariant,
        paddingLeft: 4,
    },
    input: {
        backgroundColor: REGISTRATION_COLORS.surfaceContainerLow,
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        fontWeight: '700',
        color: REGISTRATION_COLORS.onSurface,
    },
    trackSelector: {
        gap: 10,
    },
    trackOption: {
        backgroundColor: REGISTRATION_COLORS.surface,
        borderWidth: 1,
        borderColor: REGISTRATION_COLORS.outlineVariant + '4D',
        borderRadius: 12,
        padding: 16,
    },
    trackOptionSelected: {
        backgroundColor: REGISTRATION_COLORS.primary,
        borderColor: REGISTRATION_COLORS.primary,
    },
    trackText: {
        fontSize: 14,
        fontWeight: '600',
        color: REGISTRATION_COLORS.onSurface,
    },
    trackTextSelected: {
        color: REGISTRATION_COLORS.onPrimary,
    },
    checkboxRow: {
        paddingVertical: 8,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: REGISTRATION_COLORS.outlineVariant + '80',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: REGISTRATION_COLORS.primary,
        borderColor: REGISTRATION_COLORS.primary,
    },
    checkboxText: {
        flex: 1,
        fontSize: 13,
        color: REGISTRATION_COLORS.onSurfaceVariant,
    },
    emailText: {
        fontWeight: '700',
        color: REGISTRATION_COLORS.onSurface,
    },
    submitButton: {
        backgroundColor: REGISTRATION_COLORS.primary,
        borderRadius: 28,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: REGISTRATION_COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        fontSize: 17,
        fontWeight: '800',
        color: REGISTRATION_COLORS.onPrimary,
    },
});
