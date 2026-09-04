import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ATTACH_LABEL } from '../constants/createAssignmentData';

export default function AttachmentPicker({ attachments, onAdd }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Attachments</Text>
            <View style={styles.rows}>
                {attachments.map((attachment) => (
                    <View key={attachment} style={styles.attachmentRow}>
                        <MaterialIcons name="attach-file" size={15} color="#0050d4" />
                        <Text style={styles.attachmentText} numberOfLines={1}>
                            {attachment}
                        </Text>
                        <TouchableOpacity onPress={() => onAdd('remove', attachment)} activeOpacity={0.7}>
                            <MaterialIcons name="close" size={16} color="#8a8f94" />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={styles.addRow} onPress={() => onAdd('add')} activeOpacity={0.85}>
                    <MaterialIcons name="add" size={16} color="#0050d4" />
                    <Text style={styles.addText}>{ATTACH_LABEL}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 8,
    },
    rows: {
        gap: 8,
    },
    attachmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#e8efff',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    attachmentText: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#0050d4',
    },
    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#a8bfe8',
        borderRadius: 10,
        paddingVertical: 10,
    },
    addText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
});