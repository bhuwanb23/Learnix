import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuestionListHeader({ quizTitle, quizDescription, onImport }) {
    return (
        <View style={styles.container}>
            {/* Breadcrumb */}
            <View style={styles.breadcrumb}>
                <Text style={styles.breadcrumbText}>Quiz Editor</Text>
                <MaterialIcons name="chevron-right" size={16} color="#747779" />
                <Text style={styles.breadcrumbActive}>Questions</Text>
            </View>

            {/* Title and Description */}
            <View style={styles.headerContent}>
                <View style={styles.titleSection}>
                    <Text style={styles.quizTitle}>{quizTitle || 'Cell Biology 101'}</Text>
                    <Text style={styles.description}>
                        {quizDescription || 'Curate and organize your question set. Use the handles to reorder or expand cards for detailed option management.'}
                    </Text>
                </View>

                {/* Import Button */}
                <TouchableOpacity style={styles.importButton} onPress={onImport} activeOpacity={0.85}>
                    <MaterialIcons name="file-upload" size={20} color="#2c2f31" />
                    <Text style={styles.importButtonText}>Import</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 16,
    },
    breadcrumbText: {
        fontFamily: 'Manrope',
        fontSize: 13,
        color: '#747779',
    },
    breadcrumbActive: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 13,
        color: '#0050d4',
        fontWeight: '600',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 16,
    },
    titleSection: {
        flex: 1,
    },
    quizTitle: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 28,
        fontWeight: '800',
        color: '#2c2f31',
        marginBottom: 8,
    },
    description: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#747779',
        lineHeight: 20,
    },
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#dfe3e6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    importButtonText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 14,
        fontWeight: '600',
        color: '#2c2f31',
    },
});
