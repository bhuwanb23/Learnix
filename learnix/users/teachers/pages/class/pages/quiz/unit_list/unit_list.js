import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QuizHeader from './components/QuizHeader';
import QuizUnitCard from './components/QuizUnitCard';
import { UNITS, HEADER } from './constants/unitData';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function UnitList({ route, navigation }) {
    const classData = route?.params?.classData;

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleManageUnit = (unit) => {
        console.log('Manage unit:', unit.id);
    };

    const handleCreateUnit = () => {
        console.log('Create new unit');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerWrapper}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                        <MaterialIcons name="arrow-back" size={24} color="#64748b" />
                    </TouchableOpacity>
                    <QuizHeader 
                        breadcrumb={HEADER.breadcrumb}
                        title={HEADER.title}
                        subtitle={HEADER.subtitle}
                    />
                </View>
                <View style={styles.unitsList}>
                    {UNITS.map((unit) => (
                        <QuizUnitCard
                            key={unit.id}
                            unit={unit}
                            onManage={() => handleManageUnit(unit)}
                        />
                    ))}
                    <TouchableOpacity style={styles.createCard} onPress={handleCreateUnit} activeOpacity={0.7}>
                        <View style={styles.createIconContainer}>
                            <MaterialIcons name="add" size={32} color="#595c5e" />
                        </View>
                        <Text style={styles.createTitle}>Create New Unit</Text>
                        <Text style={styles.createSubtitle}>Add a new curriculum module to this subject</Text>
                    </TouchableOpacity>
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
    headerWrapper: {
        paddingHorizontal: 24,
        paddingTop: 16,
        marginBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    unitsList: {
        paddingHorizontal: 24,
    },
    createCard: {
        backgroundColor: '#ffffff',
        padding: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e9eb',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
        gap: 8,
    },
    createIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#d9dde0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    createTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#2c2f31',
    },
    createSubtitle: {
        fontFamily: 'Manrope',
        fontSize: 13,
        color: '#595c5e',
        textAlign: 'center',
    },
});
