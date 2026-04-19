import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UnitHeader from './components/UnitHeader';
import Breadcrumb from './components/Breadcrumb';
import UnitCard from './components/UnitCard';
import { UNITS, HEADER, BREADCRUMB } from './constants/unitData';
import TopicList from '../topic_list/topic_list';

export default function UnitList({ route, navigation }) {
    const courseData = route?.params?.courseData || {
        id: 'SEC-042',
        title: 'Data Structures',
        color: '#0050d4',
    };

    const [currentScreen, setCurrentScreen] = React.useState('units');
    const [selectedUnit, setSelectedUnit] = React.useState(null);

    const handleNavigate = (screen, params = {}) => {
        if (screen === 'TopicList') {
            setCurrentScreen('TopicList');
            setSelectedUnit(params.unitData);
        } else if (screen === 'main') {
            setCurrentScreen('units');
            setSelectedUnit(null);
        }
    };

    const handleBack = () => {
        if (currentScreen === 'TopicList') {
            handleNavigate('main');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleViewTopics = (unit) => {
        handleNavigate('TopicList', { unitData: unit });
    };

    const handleEdit = (unit) => {
        console.log('Edit unit:', unit.id);
    };

    const handleDelete = (unit) => {
        console.log('Delete unit:', unit.id);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {currentScreen === 'TopicList' ? (
                <TopicList 
                    route={{ params: { unitData: selectedUnit } }} 
                    navigation={{ goBack: handleBack }} 
                />
            ) : (
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
            )}
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