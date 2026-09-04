import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FormSection from './FormSection';

export default function DeliverySection({ section, data, date, room, privateNotes, onDateChange, onRoomChange, onPrivateNotesChange }) {
    return (
        <FormSection
            icon={section.icon}
            iconBg={section.iconBg}
            iconColor={section.iconColor}
            title={section.title}
            subtitle={section.subtitle}
        >
            <View style={styles.fieldsRow}>
                <View style={styles.field}>
                    <Text style={styles.label}>
                        <MaterialIcons name={data.date.icon} size={15} color={data.date.iconColor} />  {data.date.label}
                    </Text>
                    <View style={styles.inputWithIcon}>
                        <MaterialIcons name="date-range" size={18} color="#595c5e" />
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={onDateChange}
                        />
                    </View>
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>
                        <MaterialIcons name={data.room.icon} size={15} color={data.room.iconColor} />  {data.room.label}
                    </Text>
                    <View style={styles.inputWithIcon}>
                        <MaterialIcons name="hub" size={18} color="#595c5e" />
                        <TextInput
                            style={styles.input}
                            value={room}
                            onChangeText={onRoomChange}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.field}>
                <View style={styles.notesHeader}>
                    <Text style={styles.label}>
                        <MaterialIcons name={data.privateNotes.icon} size={16} color={data.privateNotes.iconColor} />  {data.privateNotes.label}
                    </Text>
                    <View style={styles.facultyBadge}>
                        <Text style={styles.facultyBadgeText}>{data.privateNotes.facultyLabel}</Text>
                    </View>
                </View>
                <TextInput
                    style={[styles.input, styles.notesArea]}
                    value={privateNotes}
                    onChangeText={onPrivateNotesChange}
                    placeholder={data.privateNotes.placeholder}
                    placeholderTextColor="#abadaf"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                />
            </View>
        </FormSection>
    );
}

const styles = StyleSheet.create({
    fieldsRow: {
        flexDirection: 'column',
        gap: 16,
        marginBottom: 20,
    },
    field: {
        gap: 6,
    },
    label: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        alignItems: 'center',
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 44,
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    input: {
        flex: 1,
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#2c2f31',
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    facultyBadge: {
        backgroundColor: 'rgba(162, 56, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    facultyBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#a23800',
        letterSpacing: 1,
    },
    notesArea: {
        height: 120,
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 14,
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#2c2f31',
        lineHeight: 18,
    },
});
