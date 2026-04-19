import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UnitHeader from './components/UnitHeader';
import Breadcrumb from './components/Breadcrumb';
import UnitCard from './components/UnitCard';
import { UNITS, HEADER, BREADCRUMB } from './constants/unitData';

export default function UnitList({ route, navigation }) {
    const courseData = route?.params?.courseData || {
        id: 'SEC-042',
        title: 'Data Structures',
        color: '#0050d4',
    };

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleViewTopics = (unit) => {
        console.log('View topics for:', unit.id);
    };

    const handleEdit = (unit) => {
        console.log('Edit unit:', unit.id);
    };

    const handleDelete = (unit) => {
        console.log('Delete unit:', unit.id);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <UnitHeader 
                    title={HEADER.title} 
                    courseName={courseData.title}
                    onBack={handleBack} 
                />
                <Breadcrumb items={BREADCRUMB} />
                <View style={styles.unitsList}>
                    {UNITS.map((unit) => (
                        <UnitCard
                            key={unit.id}
                            unit={unit}
                            onViewTopics={() => handleViewTopics(unit)}
                            onEdit={() => handleEdit(unit)}
                            onDelete={() => handleDelete(unit)}
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
    scrollContent: {
        paddingBottom: 32,
    },
    unitsList: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
});