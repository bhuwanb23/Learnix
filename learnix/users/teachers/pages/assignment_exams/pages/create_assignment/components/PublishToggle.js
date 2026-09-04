import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PUBLISH_LABEL } from '../constants/createAssignmentData';

export default function PublishToggle({ enabled, onChange }) {
    return (
        <TouchableOpacity style={styles.row} onPress={() => onChange(!enabled)} activeOpacity={0.85}>
            <View style={styles.textWrap}>
                <Text style={styles.title}>{PUBLISH_LABEL.title}</Text>
                <Text style={styles.subtitle}>{PUBLISH_LABEL.subtitle}</Text>
            </View>
            <View style={[styles.track, enabled && styles.trackOn]}>
                <View style={[styles.thumb, enabled && styles.thumbOn]} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f5f7f9',
        borderRadius: 12,
        padding: 14,
    },
    textWrap: {
        flex: 1,
        paddingRight: 12,
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    subtitle: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
    },
    track: {
        width: 46,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#d6dadd',
        padding: 3,
    },
    trackOn: {
        backgroundColor: '#0050d4',
    },
    thumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ffffff',
    },
    thumbOn: {
        transform: [{ translateX: 20 }],
    },
});