import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { REGISTRATION_COLORS } from '../constants/registrationData';

export default function WorkshopImage({ image, location }) {
    return (
        <View style={styles.container}>
            <Image
                source={{ uri: image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800' }}
                style={styles.image}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.gradient}
            />
            <View style={styles.overlay}>
                <Text style={styles.locationText}>{location || 'Main Symposium Hall'}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 220,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 8,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
    },
    locationText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
    },
});
