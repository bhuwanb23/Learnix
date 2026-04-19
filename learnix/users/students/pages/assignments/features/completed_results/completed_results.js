import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { COMPLETED_RESULTS_DATA, COMPLETED_RESULTS_COLORS } from './constants/completedResultsData';
import HeaderSection from './components/HeaderSection';
import GradeCard from './components/GradeCard';
import CompetencyMapCard from './components/CompetencyMapCard';
import InstructorFeedbackCard from './components/InstructorFeedbackCard';
import ImprovementSuggestionsCard from './components/ImprovementSuggestionsCard';

export default function CompletedResultsScreen({ route, navigation }) {
    const clickedAssignment = route?.params?.assignment || {};
    const resultsData = {
        ...COMPLETED_RESULTS_DATA,
        ...clickedAssignment,
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const handleDownloadPDF = () => {
        // TODO: Implement PDF download
        console.log('Download annotated PDF');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#0050d4" translucent />

            <HeaderSection title={resultsData.title} onBack={handleBack} />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.leftColumn}>
                    <GradeCard results={resultsData} />
                    <CompetencyMapCard results={resultsData} />
                </View>
                <View style={styles.rightColumn}>
                    <InstructorFeedbackCard results={resultsData} />
                    <ImprovementSuggestionsCard results={resultsData} />
                    <View style={styles.downloadButtonContainer}>
                        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPDF}>
                            <MaterialIcons name="download" size={16} color={COMPLETED_RESULTS_COLORS.onSurface} />
                            <Text style={styles.downloadButtonText}>Download Annotated PDF</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COMPLETED_RESULTS_COLORS.surface,
    },
    scrollView: {
        flex: 1,
    },
    leftColumn: {
        paddingHorizontal: 0,
    },
    rightColumn: {
        paddingHorizontal: 0,
    },
    downloadButtonContainer: {
        paddingHorizontal: 12,
        marginTop: 12,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COMPLETED_RESULTS_COLORS.surfaceContainerHigh,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        alignSelf: 'flex-end',
    },
    downloadButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: COMPLETED_RESULTS_COLORS.onSurface,
    },
});
