import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VIEW_PROFILE_COLORS } from '../constants/viewProfileData';

export default function ProfileHeroSection({ profile, onBack, onEditPhoto }) {
    return (
        <View style={styles.container}>
            {/* Avatar Section */}
            <View style={styles.avatarContainer}>
                <View style={styles.avatarWrapper}>
                    <Image
                        source={{ uri: profile.avatar }}
                        style={styles.avatar}
                    />
                    <TouchableOpacity style={styles.editPhotoOverlay} activeOpacity={0.7} onPress={onEditPhoto}>
                        <MaterialIcons name="photo-camera" size={24} color="#ffffff" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.editAvatarButton} activeOpacity={0.7} onPress={onEditPhoto}>
                    <MaterialIcons name="edit" size={16} color={VIEW_PROFILE_COLORS.onPrimary} />
                </TouchableOpacity>
            </View>

            {/* Name & Role */}
            <View style={styles.infoContainer}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.role}>{profile.role}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        backgroundColor: VIEW_PROFILE_COLORS.surfaceContainerHigh,
        borderWidth: 4,
        borderColor: VIEW_PROFILE_COLORS.surfaceContainerLowest,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    avatar: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    editPhotoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: VIEW_PROFILE_COLORS.primary,
        padding: 8,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    infoContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: VIEW_PROFILE_COLORS.onSurface,
    },
    role: {
        fontSize: 14,
        fontWeight: '500',
        color: VIEW_PROFILE_COLORS.onSurfaceVariant,
        marginTop: 4,
    },
});
