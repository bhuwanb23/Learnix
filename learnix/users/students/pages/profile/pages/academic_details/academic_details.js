import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useWindowDimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ACADEMIC_COLORS, ACADEMIC_DATA, SUBJECTS, COURSE_MATERIALS } from './constants/academicData';
import DepartmentHero from './components/DepartmentHero';
import StatsOverview from './components/StatsOverview';
import SubjectCard from './components/SubjectCard';
import CourseMaterials from './components/CourseMaterials';

export default function AcademicDetailsPage({ route, navigation }) {
    const { width } = useWindowDimensions();

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleSubjectPress = (subject) => {
        Alert.alert('Subject Details', `Opening ${subject.name}`);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={ACADEMIC_COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Academic Profile</Text>
                </View>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.7} onPress={() => Alert.alert('Options', 'More academic options will appear here.')}>
                    <MaterialIcons name="more-vert" size={24} color={ACADEMIC_COLORS.onSurfaceVariant} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <DepartmentHero data={ACADEMIC_DATA} />
                <StatsOverview data={ACADEMIC_DATA} />

                {/* Enrolled Subjects */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Enrolled Subjects</Text>
                        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7} onPress={() => Alert.alert('Semester', 'Switch between enrolled semesters here.')}>
                            <MaterialIcons name="filter-list" size={20} color={ACADEMIC_COLORS.primary} />
                            <Text style={styles.filterText}>Spring 2024</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.subjectsList}>
                        {SUBJECTS.map((subject) => (
                            <SubjectCard
                                key={subject.id}
                                subject={subject}
                                onPress={() => handleSubjectPress(subject)}
                            />
                        ))}
                    </View>
                </View>

                <CourseMaterials materials={COURSE_MATERIALS} />

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ACADEMIC_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLow,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: ACADEMIC_COLORS.onSurface,
    },
    moreButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '700',
        color: ACADEMIC_COLORS.primary,
    },
    subjectsList: {
        paddingHorizontal: 16,
    },
});
