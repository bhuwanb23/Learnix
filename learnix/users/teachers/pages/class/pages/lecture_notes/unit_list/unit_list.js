import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UnitHeader from './components/UnitHeader';
import Breadcrumb from './components/Breadcrumb';
import UnitCard from './components/UnitCard';
import { UNITS, HEADER, BREADCRUMB } from './constants/unitData';
import TopicList from '../topic_list/topic_list';
import CreateEditNotes from '../create_edit_notes/create_edit_notes';

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
        } else if (screen === 'CreateEditNotes') {
            setCurrentScreen('CreateEditNotes');
            setSelectedUnit(params.unitData);
        } else if (screen === 'main') {
            setCurrentScreen('units');
            setSelectedUnit(null);
        }
    };

    const handleBack = () => {
        if (currentScreen === 'TopicList' || currentScreen === 'CreateEditNotes') {
            handleNavigate('main');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleViewTopics = (unit) => {
        handleNavigate('TopicList', { unitData: unit });
    };

    const handleEdit = (unit) => {
        handleNavigate('CreateEditNotes', { unitData: unit });
    };

    const handleDelete = (unit) => {
        Alert.alert(
            'Delete Unit?',
            `"${unit.title}" and all its notes will be permanently removed.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Unit deleted', 'The unit was removed.') },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {currentScreen === 'CreateEditNotes' ? (
                <CreateEditNotes
                    route={{ params: { unitData: selectedUnit } }}
                    navigation={{ goBack: handleBack }}
                />
            ) : currentScreen === 'TopicList' ? (
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