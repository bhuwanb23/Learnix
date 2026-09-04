import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function FormField({ field, value, onChange }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>
                {field.label}
                {field.required ? <Text style={styles.required}> *</Text> : null}
            </Text>
            <View style={styles.inputWrap}>
                <MaterialIcons name={field.icon} size={17} color="#8a8f94" />
                {field.multiline ? (
                    <TextInput
                        style={[styles.input, styles.multiline]}
                        placeholder={field.placeholder}
                        placeholderTextColor="#a6abb1"
                        value={value}
                        onChangeText={(text) => onChange(field.key, text)}
                        multiline
                        textAlignVertical="top"
                    />
                ) : (
                    <TextInput
                        style={styles.input}
                        placeholder={field.placeholder}
                        placeholderTextColor="#a6abb1"
                        value={value}
                        onChangeText={(text) => onChange(field.key, text)}
                        keyboardType={field.keyboardType || 'default'}
                        autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    field: {
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 7,
    },
    required: {
        color: '#b31b25',
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    input: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        color: '#2c2f31',
        paddingVertical: 0,
    },
    multiline: {
        minHeight: 88,
    },
});