import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/lectureNotesData';

export default function LectureNotesHeader({ onBack, onSearch }) {
    const insets = useSafeAreaInsets();
    const topPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);

    return (
        <View style={[styles.container, { paddingTop: topPad }]}>
            <StatusBar barStyle="light-content" />

            <View style={styles.leftSection}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onBack}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Lecture Notes</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        minHeight: 48,
        color: 'black',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        letterSpacing: -0.3,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
