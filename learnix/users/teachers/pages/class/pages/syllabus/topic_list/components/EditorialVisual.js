import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditorialVisual({ visual }) {
    return (
        <View style={styles.container}>
            <ImageBackground source={{ uri: visual.image }} style={styles.image} imageStyle={styles.imageStyle}>
                <LinearGradient
                    colors={['rgba(15, 23, 42, 0.85)', 'rgba(15, 23, 42, 0.45)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.overlay}
                >
                    <Text style={styles.eyebrow}>{visual.eyebrow}</Text>
                    <Text style={styles.text} numberOfLines={2}>{visual.text}</Text>
                </LinearGradient>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 112,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    image: {
        flex: 1,
    },
    imageStyle: {
        borderRadius: 12,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    eyebrow: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#658eff',
        letterSpacing: 2,
        marginBottom: 4,
    },
    text: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 14,
        fontWeight: '600',
        color: '#f1f2ff',
        maxWidth: '80%',
    },
});
