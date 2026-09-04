import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ListHeader from './components/ListHeader';
import AssignmentTabs from './components/AssignmentTabs';
import AssignmentCard from './components/AssignmentCard';
import { LIST_HEADER, TABS, ASSIGNMENTS } from './constants/assignmentData';

export default function AssignmentList({ route, navigation }) {
    const [activeTab, setActiveTab] = useState('active');

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleOpenAssignment = (assignment) => {
        if (navigation?.navigate) {
            navigation.navigate('AssignmentDetail', { assignment });
        }
    };

    const visibleAssignments = ASSIGNMENTS.filter((assignment) => assignment.status === activeTab);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ListHeader
                title={LIST_HEADER.title}
                subtitle={LIST_HEADER.subtitle}
                onBack={handleBack}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <AssignmentTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
                <View style={styles.list}>
                    {visibleAssignments.map((assignment) => (
                        <AssignmentCard
                            key={assignment.id}
                            assignment={assignment}
                            onPress={() => handleOpenAssignment(assignment)}
                        />
                    ))}
                </View>
            </ScrollView>
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
    list: {
        paddingHorizontal: 20,
    },
});