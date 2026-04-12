import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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
        console.log('Add file');
    };

    const handleSaveDraft = () => {
        console.log('Save draft');
    };

    const handleSubmit = () => {
        console.log('Submit assignment');
    };

    return (
        <View style={styles.container}>
            <HeaderSection assignment={submissionData} onBack={handleBack} />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <SummaryDashboard submission={submissionData} />
                <View style={styles.mainContent}>
                    <View style={styles.leftColumn}>
                        <InstructionsCard instructions={submissionData.instructions} />
                        <AttachmentsGallery attachments={submissionData.attachments} onAddFile={handleAddFile} />
                    </View>
                    <View style={styles.rightColumn}>
                        <TextEditor editor={submissionData.editor} onSaveDraft={handleSaveDraft} onSubmit={handleSubmit} />
                    </View>
                </View>
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
    mainContent: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 16,
    },
    leftColumn: {
        flex: 1,
    },
    rightColumn: {
        flex: 2,
    },
});