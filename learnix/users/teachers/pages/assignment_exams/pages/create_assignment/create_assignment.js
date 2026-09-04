import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateHeader from '../../components/CreateHeader';
import ChipSelector from '../../components/ChipSelector';
import AttachmentPicker from './components/AttachmentPicker';
import PublishToggle from './components/PublishToggle';
import CreateActions from '../../components/CreateActions';
import FormField from '../../components/FormField';
import { CREATE_HEADER, FORM_FIELDS, CLASS_OPTIONS, DUE_OPTIONS } from './constants/createAssignmentData';

const DEFAULT_ATTACHMENTS = ['problem_set_template.pdf'];

export default function CreateAssignment({ route, navigation }) {
    const editing = route?.params?.assignment || null;

    const [values, setValues] = useState(() =>
        editing
            ? {
                  title: editing.title,
                  description: '',
                  points: '',
              }
            : {}
    );
    const [selectedClass, setSelectedClass] = useState(() => (editing ? editing.classCode : null));
    const [dueDate, setDueDate] = useState(() => (editing ? editing.dueDate : null));
    const [publish, setPublish] = useState(true);
    const [attachments, setAttachments] = useState(DEFAULT_ATTACHMENTS);

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleChange = (key, text) => {
        setValues((prev) => ({ ...prev, [key]: text }));
    };

    const handleAttachment = (action, name) => {
        if (action === 'add') {
            console.log('Pick attachment file');
            setAttachments((prev) => [...prev, `attachment_${prev.length + 1}.pdf`]);
        } else if (action === 'remove') {
            setAttachments((prev) => prev.filter((item) => item !== name));
        }
    };

    const requiredKeys = FORM_FIELDS.filter((field) => field.required).map((field) => field.key);
    const valid =
        requiredKeys.every((key) => values[key] && values[key].trim().length > 0) &&
        Boolean(selectedClass) &&
        Boolean(dueDate);

    const handleSave = () => {
        console.log(editing ? 'Update assignment:' : 'Create assignment:', {
            ...values,
            class: selectedClass,
            dueDate,
            publish,
            attachments,
        });
        handleBack();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <CreateHeader
                title={editing ? 'Edit Assignment' : CREATE_HEADER.title}
                subtitle={editing ? `Editing ${editing.title}` : CREATE_HEADER.subtitle}
                onBack={handleBack}
            />
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
                    <ChipSelector
                        label="Class"
                        options={CLASS_OPTIONS}
                        selected={selectedClass}
                        onSelect={setSelectedClass}
                    />
                    <ChipSelector
                        label="Due Date"
                        options={DUE_OPTIONS}
                        selected={dueDate}
                        onSelect={setDueDate}
                    />
                    <AttachmentPicker attachments={attachments} onAdd={handleAttachment} />
                    <PublishToggle enabled={publish} onChange={setPublish} />
                </View>
            </ScrollView>
            <CreateActions
                onCancel={handleBack}
                onSave={handleSave}
                valid={valid}
                saveLabel={editing ? 'Save Changes' : 'Save & Publish'}
                saveIcon="send"
            />
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