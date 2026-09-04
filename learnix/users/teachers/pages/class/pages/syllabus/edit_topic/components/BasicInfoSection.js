import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FormSection from './FormSection';

export default function BasicInfoSection({
    section,
    data,
    title,
    code,
    duration,
    description,
    onTitleChange,
    onCodeChange,
    onDurationChange,
    onDescriptionChange,
}) {
    const handleDecrement = () => {
        if (duration.value > duration.min) {
            onDurationChange(Math.max(duration.min, duration.value - duration.step));
        }
    };

    const handleIncrement = () => {
        if (duration.value < duration.max) {
            onDurationChange(Math.min(duration.max, duration.value + duration.step));
        }
    };

    return (
        <FormSection
            icon={section.icon}
            iconBg={section.iconBg}
            iconColor={section.iconColor}
            title={section.title}
            subtitle={section.subtitle}
            rightLabel={section.stepLabel}
        >
            {/* Title + Code */}
            <View style={styles.fieldsRow}>
                <View style={[styles.field, styles.fieldWide]}>
                    <Text style={styles.label}>
                        {data.title.label} {data.title.required && <Text style={styles.required}>*</Text>}
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={onTitleChange}
                        placeholder={data.title.placeholder}
                        placeholderTextColor="#abadaf"
                    />
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>
                        {data.code.label}
                        <Text style={styles.autoLabel}>  {data.code.autoLabel}</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, styles.monoInput]}
                        value={code}
                        onChangeText={onCodeChange}
                    />
                </View>
            </View>

            {/* Duration stepper */}
            <View style={styles.durationCard}>
                <View style={styles.durationInfo}>
                    <View style={styles.durationIconBox}>
                        <MaterialIcons name={duration.icon} size={18} color="#595c5e" />
                    </View>
                    <View>
                        <Text style={styles.durationTitle}>{duration.title}</Text>
                        <Text style={styles.durationSubtitle}>{duration.subtitle}</Text>
                    </View>
                </View>
                <View style={styles.stepperGroup}>
                    <View style={styles.stepper}>
                        <TouchableOpacity style={styles.stepperButton} onPress={handleDecrement} activeOpacity={0.8}>
                            <MaterialIcons name="remove" size={18} color="#2c2f31" />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{duration.value.toFixed(1)} {duration.unit}</Text>
                        <TouchableOpacity style={styles.stepperButton} onPress={handleIncrement} activeOpacity={0.8}>
                            <MaterialIcons name="add" size={18} color="#2c2f31" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.lecturesLabel}>{duration.lecturesLabel}</Text>
                </View>
            </View>

            {/* Description */}
            <View style={styles.field}>
                <View style={styles.descHeader}>
                    <Text style={styles.label}>{data.description.label}</Text>
                    <Text style={styles.descHint}>{data.description.markdownLabel}</Text>
                </View>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={onDescriptionChange}
                    placeholder={data.description.placeholder}
                    placeholderTextColor="#abadaf"
                    multiline
                    numberOfLines={4}
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
        marginBottom: 16,
    },
    fieldWide: {
        flex: 1,
    },
    field: {
        flex: 1,
        gap: 6,
    },
    label: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
    },
    required: {
        color: '#b31b25',
    },
    autoLabel: {
        fontFamily: 'Manrope',
        fontSize: 11,
        fontWeight: '400',
        color: '#595c5e',
    },
    input: {
        height: 44,
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#2c2f31',
    },
    monoInput: {
        fontFamily: 'Manrope-SemiBold',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    durationCard: {
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    durationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 200,
    },
    durationIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#d9dde0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
    },
    durationSubtitle: {
        fontFamily: 'Manrope',
        fontSize: 12,
        color: '#595c5e',
    },
    stepperGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    stepperButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
        minWidth: 70,
        textAlign: 'center',
    },
    lecturesLabel: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    descHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    descHint: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        fontWeight: '500',
        color: '#595c5e',
    },
    textArea: {
        height: 96,
        paddingTop: 12,
        lineHeight: 20,
    },
});
