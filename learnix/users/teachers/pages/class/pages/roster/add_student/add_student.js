import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddStudentHeader from './components/AddStudentHeader';
import FormField from './components/FormField';
import AddStudentActions from './components/AddStudentActions';
import { FORM_FIELDS } from './constants/addStudentData';

export default function AddStudent({ route, navigation }) {
    const [values, setValues] = useState({});

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleChange = (key, text) => {
        setValues((prev) => ({ ...prev, [key]: text }));
    };

    const requiredKeys = FORM_FIELDS.filter((field) => field.required).map((field) => field.key);
    const valid = requiredKeys.every((key) => values[key] && values[key].trim().length > 0);

    const handleSave = () => {
        const name = values.name ? values.name.trim() : 'Student';
        Alert.alert('Student Enrolled', `${name} was added to the roster. An invitation has been queued.`, [
            { text: 'OK', onPress: () => handleBack() },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AddStudentHeader onBack={handleBack} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formCard}>
                    {FORM_FIELDS.map((field) => (
                        <FormField
                            key={field.key}
                            field={field}
                            value={values[field.key] || ''}
                            onChange={handleChange}
                        />
                    ))}
                </View>
            </ScrollView>
            <AddStudentActions onCancel={handleBack} onSave={handleSave} valid={valid} />
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