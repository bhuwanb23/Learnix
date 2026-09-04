import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GradeHeader({ assignmentTitle, index, total, onBack, viewOnly }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
            <View style={styles.topRow}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.85}>
                    <MaterialIcons name="arrow-back" size={22} color="#2c2f31" />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>{assignmentTitle}</Text>
                    <Text style={styles.subtitle}>
                        {viewOnly
                            ? 'Viewing saved submission'
                            : total > 0
                                ? `Submission ${index + 1} of ${total}`
                                : 'All submissions graded'}
                    </Text>
                </View>
                <View style={styles.progressBadge}>
                    <Text style={styles.progressText}>
                        {viewOnly ? 'View' : total > 0 ? `${index + 1}/${total}` : 'Done'}
                    </Text>
                </View>
            </View>
            {!viewOnly && total > 0 && (
                <View style={styles.track}>
                    <View style={[styles.fill, { width: `${((index + 1) / total) * 100}%` }]} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    titleWrap: {
        flex: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 17,
        fontWeight: '700',
        color: '#2c2f31',
    },
    subtitle: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
        marginTop: 2,
    },
    progressBadge: {
        backgroundColor: '#e8efff',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    progressText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
    },
    track: {
        height: 5,
        borderRadius: 3,
        backgroundColor: '#e5e8ec',
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#0050d4',
    },
});