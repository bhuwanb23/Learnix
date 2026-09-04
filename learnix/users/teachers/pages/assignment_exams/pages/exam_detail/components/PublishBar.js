import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RESULT_ACTIONS } from '../constants/examDetailData';

export default function PublishBar({ complete, published, onSaveDraft, onPublish }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={styles.draftButton} onPress={onSaveDraft} activeOpacity={0.85}>
                <Text style={styles.draftText}>{RESULT_ACTIONS.saveDraft}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.publishButton, !complete && styles.publishButtonDisabled]}
                onPress={onPublish}
                activeOpacity={0.85}
                disabled={!complete}
            >
                <MaterialIcons name="send" size={17} color="#ffffff" />
                <Text style={styles.publishText}>
                    {published ? RESULT_ACTIONS.republish : RESULT_ACTIONS.publish}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e8ec',
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    draftButton: {
        paddingHorizontal: 20,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#d6dadd',
    },
    draftText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#595c5e',
    },
    publishButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0050d4',
        borderRadius: 12,
        height: 50,
    },
    publishButtonDisabled: {
        backgroundColor: '#a8bfe8',
    },
    publishText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
});