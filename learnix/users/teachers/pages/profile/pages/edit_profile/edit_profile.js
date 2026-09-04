import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '../../components/PageHeader';
import FormField from './components/FormField';
import SaveBar from './components/SaveBar';
import { PROFILE, EDIT_FIELDS } from '../../constants/profileData';

export default function EditProfile({ route, navigation }) {
    const [values, setValues] = useState(() => {
        const initial = {};
        EDIT_FIELDS.forEach((field) => {
            initial[field.key] = PROFILE[field.key] || '';
        });
        return initial;
    });

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleChange = (key, text) => {
        setValues((prev) => ({ ...prev, [key]: text }));
    };

    const requiredKeys = EDIT_FIELDS.filter((field) => field.required).map((field) => field.key);
    const valid = requiredKeys.every((key) => values[key] && values[key].trim().length > 0);

    const handleSave = () => {
        Alert.alert('Profile Updated', `Your changes have been saved for ${values.name}.`);
        handleBack();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <PageHeader title="Edit Profile" subtitle="Update your professional details" onBack={handleBack} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formCard}>
                    {EDIT_FIELDS.map((field) => (
                        <FormField
                            key={field.key}
                            field={field}
                            value={values[field.key] || ''}
                            onChange={handleChange}
                        />
                    ))}
                </View>
            </ScrollView>
            <SaveBar valid={valid} onCancel={handleBack} onSave={handleSave} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    formCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
});