import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UnitHeader from './components/UnitHeader';
import OverviewCard from './components/OverviewCard';
import UnitCard from './components/UnitCard';
import FloatingToolbar from './components/FloatingToolbar';
import { SYLLABUS_HEADER, OVERVIEW, SECTION_HEADING, FILTERS, UNITS } from './constants/unitData';

const PROGRESS_STATUSES = ['active', 'in_progress'];

export default function UnitList({ route, navigation }) {
    const classData = route?.params?.classData || {
        id: 'PSY-402',
        code: 'PSY-402',
        title: 'Advanced Cognitive Psychology',
    };

    const header = {
        title: SYLLABUS_HEADER.title,
        code: classData.code || SYLLABUS_HEADER.code,
        courseName: classData.title || SYLLABUS_HEADER.courseName,
    };

    const [activeFilter, setActiveFilter] = useState('all');

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleExport = () => {
        console.log('Export syllabus');
    };

    const handleSettings = () => {
        console.log('Syllabus settings');
    };

    const handleUnitAction = (actionId, unit) => {
        console.log('Unit action:', actionId, unit?.id);
    };

    const handleAddUnit = () => {
        console.log('Add new unit');
    };

    const handleSyncCalendar = () => {
        console.log('Sync calendar');
    };

    const visibleUnits = activeFilter === 'progress'
        ? UNITS.filter((unit) => PROGRESS_STATUSES.includes(unit.status))
        : UNITS;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <UnitHeader
                    header={header}
                    onBack={handleBack}
                    onExport={handleExport}
                    onSettings={handleSettings}
                />
                <OverviewCard overview={OVERVIEW} />

                {/* Section heading + quick filter */}
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>{SECTION_HEADING.title}</Text>
                        <Text style={styles.sectionSubtitle}>{SECTION_HEADING.subtitle}</Text>
                    </View>
                    <View style={styles.filterGroup}>
                        {FILTERS.map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                style={[
                                    styles.filterPill,
                                    activeFilter === filter.id && styles.filterPillActive,
                                ]}
                                onPress={() => setActiveFilter(filter.id)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.filterPillText,
                                        activeFilter === filter.id && styles.filterPillTextActive,
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Unit cards */}
                <View style={styles.cardsList}>
                    {visibleUnits.map((unit) => (
                        <UnitCard key={unit.id} unit={unit} onAction={handleUnitAction} />
                    ))}
                </View>
            </ScrollView>

            <FloatingToolbar onAddUnit={handleAddUnit} onSync={handleSyncCalendar} />
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
    content: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 96,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    sectionSubtitle: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
        marginBottom: 12,
    },
    filterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 4,
        alignSelf: 'flex-start',
    },
    filterPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    filterPillActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    filterPillText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#595c5e',
    },
    filterPillTextActive: {
        color: '#0050d4',
    },
    cardsList: {
        gap: 0,
    },
});
