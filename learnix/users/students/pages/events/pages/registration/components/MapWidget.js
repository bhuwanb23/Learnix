import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { REGISTRATION_COLORS } from '../constants/registrationData';

export default function MapWidget({ location, mapImage }) {
    return (
        <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={() => Alert.alert('Location', `Viewing ${location || 'Science Hub, Hall 4'} on the map.`)}>
            <Image
                source={{ uri: mapImage || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800' }}
                style={styles.mapImage}
            />
            <View style={styles.overlay}>
                <View style={styles.glassCard}>
                    <MaterialIcons name="location-on" size={20} color={REGISTRATION_COLORS.primary} />
                    <Text style={styles.locationText}>{location || 'Science Hub, Hall 4'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 160,
        borderRadius: 16,
        overflow: 'hidden',
    },
    mapImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: REGISTRATION_COLORS.primary + '1A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    locationText: {
        fontSize: 13,
        fontWeight: '800',
        color: REGISTRATION_COLORS.onSurface,
    },
});
