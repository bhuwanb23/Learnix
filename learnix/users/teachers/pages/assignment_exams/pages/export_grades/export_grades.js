import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateHeader from '../../components/CreateHeader';
import ChipSelector from '../../components/ChipSelector';
import FormatPicker from './components/FormatPicker';
import ExportBar from './components/ExportBar';
import { EXPORT_HEADER, FORMATS, CLASS_OPTIONS, PERIOD_OPTIONS } from './constants/exportData';

export default function ExportGrades({ route, navigation }) {
    const [format, setFormat] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [period, setPeriod] = useState(null);

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const valid = Boolean(format) && Boolean(selectedClass) && Boolean(period);

    const handleExport = () => {
        console.log('Export grades:', { format, class: selectedClass, period });
        handleBack();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <CreateHeader
                title={EXPORT_HEADER.title}
                subtitle={EXPORT_HEADER.subtitle}
                onBack={handleBack}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.formCard}>
                    <FormatPicker formats={FORMATS} selected={format} onSelect={setFormat} />
                    <ChipSelector
                        label="Class"
                        options={CLASS_OPTIONS}
                        selected={selectedClass}
                        onSelect={setSelectedClass}
                    />
                    <ChipSelector
                        label="Period"
                        options={PERIOD_OPTIONS}
                        selected={period}
                        onSelect={setPeriod}
                    />
                </View>
            </ScrollView>
            <ExportBar valid={valid} onCancel={handleBack} onExport={handleExport} />
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
    formCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
});