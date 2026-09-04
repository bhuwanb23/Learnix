import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function HeroCard({ color }) {
    return (
        <View style={[styles.heroCard, { backgroundColor: color }]}>
            <View style={styles.heroGradient} />
            <View style={styles.heroContent}>
                <View style={styles.heroText}>
                    <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>UPCOMING SESSION</Text>
                    </View>
                    <Text style={styles.heroTitle}>Next Lecture: Tomorrow, 10:00 AM</Text>
                    <Text style={styles.heroSubtitle}>Topic: Neural Plasticity and Memory Consolidation in Adult Learners.</Text>
                </View>
                <TouchableOpacity
                    style={styles.startButton}
                    activeOpacity={0.85}
                    onPress={() =>
                        Alert.alert('Start Session', 'The live class session will start here — join link and attendance sheet are prepared.')
                    }
                >
                    <MaterialIcons name="play-circle" size={24} color={color} />
                    <Text style={styles.startButtonText}>Start Session</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    heroCard: {
        marginHorizontal: 24,
        marginVertical: 16,
        borderRadius: 12,
        padding: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    heroGradient: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 256,
        height: 256,
        borderRadius: 128,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    heroContent: {
        flexDirection: 'column',
        gap: 20,
    },
    heroText: {
        flex: 1,
    },
    heroBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        marginBottom: 8,
    },
    heroBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 2,
    },
    heroTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 22,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    heroSubtitle: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    startButton: {
        backgroundColor: '#ffffff',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    startButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#0050d4',
    },
});
