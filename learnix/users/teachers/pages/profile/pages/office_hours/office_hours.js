import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '../../components/PageHeader';
import SlotRow from './components/SlotRow';
import { OFFICE_HOURS } from '../../constants/profileData';

export default function OfficeHours({ route, navigation }) {
    const [slots, setSlots] = useState(() => {
        const map = {};
        OFFICE_HOURS.forEach((day) => {
            day.slots.forEach((slot) => {
                map[slot.id] = slot.available;
            });
        });
        return map;
    });

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const toggleSlot = (slotId) => {
        setSlots((prev) => ({ ...prev, [slotId]: !prev[slotId] }));
    };

    const allSlots = OFFICE_HOURS.flatMap((day) => day.slots);
    const availableCount = allSlots.filter((slot) => slots[slot.id]).length;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <PageHeader
                title="Office Hours"
                subtitle="Tap a slot to toggle availability"
                onBack={handleBack}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.summary}>
                    <Text style={styles.summaryValue}>
                        {availableCount}/{allSlots.length}
                    </Text>
                    <Text style={styles.summaryLabel}>slots available this week</Text>
                </View>

                {OFFICE_HOURS.map((day) => (
                    <View key={day.id} style={styles.dayCard}>
                        <Text style={styles.dayLabel}>{day.day}</Text>
                        {day.slots.map((slot) => (
                            <SlotRow
                                key={slot.id}
                                slot={{ ...slot, available: Boolean(slots[slot.id]) }}
                                onToggle={() => toggleSlot(slot.id)}
                            />
                        ))}
                    </View>
                ))}
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
    summary: {
        alignItems: 'center',
        backgroundColor: '#0050d4',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 16,
    },
    summaryValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 26,
        fontWeight: '700',
        color: '#ffffff',
    },
    summaryLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    dayCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    dayLabel: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 6,
    },
});