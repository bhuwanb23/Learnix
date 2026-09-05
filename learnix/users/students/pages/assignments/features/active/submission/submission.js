import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import HeaderSection from './components/HeaderSection';
import SummaryDashboard from './components/SummaryDashboard';
import InstructionsCard from './components/InstructionsCard';
import AttachmentsGallery from './components/AttachmentsGallery';
import TextEditor from './components/TextEditor';
import { SUBMISSION_DATA } from './constants/submissionData';

export default function SubmissionScreen({ route, navigation, onNavigate }) {
    const clickedAssignment = route?.params?.assignment || {};
    const submissionData = {
        ...SUBMISSION_DATA,
        ...clickedAssignment,
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('details');
        } else {
            navigation.goBack();
        }
    };

    const handleAddFile = () => {
        Alert.alert('Add File', 'File picker will open here to attach your work.');
    };

    const handleSaveDraft = () => {
        Alert.alert('Draft Saved', 'Your progress has been saved as a draft.');
    };

    const handleSubmit = () => {
        if (onNavigate) {
            onNavigate('review');
        }
    };

    return (
        <View style={styles.container}>
            <HeaderSection assignment={submissionData} onBack={handleBack} />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <SummaryDashboard submission={submissionData} />
                <InstructionsCard instructions={submissionData.instructions} />
                <AttachmentsGallery attachments={submissionData.attachments} onAddFile={handleAddFile} />
                <TextEditor editor={submissionData.editor} onSaveDraft={handleSaveDraft} onSubmit={handleSubmit} />
            </ScrollView>
        </View>
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
        paddingBottom: 100,
    },
});