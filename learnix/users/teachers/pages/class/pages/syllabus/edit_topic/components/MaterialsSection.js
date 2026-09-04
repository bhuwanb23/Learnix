import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FormSection from './FormSection';

export default function MaterialsSection({ section, resources, quiz, onReplace, onRemove, onAttach, onChangeQuiz }) {
    return (
        <FormSection
            icon={section.icon}
            iconBg={section.iconBg}
            iconColor={section.iconColor}
            title={section.title}
            subtitle={section.subtitle}
            rightLabel={section.linkedLabel}
        >
            <View style={styles.resourceList}>
                {resources.map((resource) => (
                    <View key={resource.id} style={styles.resourceRow}>
                        <View style={styles.resourceInfo}>
                            <View style={[styles.resourceIcon, { backgroundColor: resource.iconBg }]}>
                                <MaterialIcons name={resource.icon} size={22} color={resource.iconColor} />
                            </View>
                            <View style={styles.resourceText}>
                                <View style={styles.resourceTypeRow}>
                                    <Text style={[styles.resourceType, { color: resource.typeColor }]}>
                                        {resource.type.toUpperCase()}
                                    </Text>
                                    <Text style={styles.resourceSize}>• {resource.size}</Text>
                                </View>
                                <Text style={styles.resourceName} numberOfLines={1}>{resource.fileName}</Text>
                            </View>
                        </View>
                        <View style={styles.resourceActions}>
                            <TouchableOpacity style={styles.actionIcon} onPress={() => onReplace(resource)} activeOpacity={0.7}>
                                <MaterialIcons name="cached" size={18} color="#595c5e" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionIcon} onPress={() => onRemove(resource)} activeOpacity={0.7}>
                                <MaterialIcons name="delete-outline" size={18} color="#b31b25" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.attachButton} onPress={onAttach} activeOpacity={0.85}>
                <MaterialIcons name="upload-file" size={18} color="#0050d4" />
                <Text style={styles.attachButtonText}>+ Attach New Document / File</Text>
            </TouchableOpacity>

            {/* Linked quiz */}
            <View style={styles.quizPanel}>
                <View style={styles.quizInfo}>
                    <View style={[styles.quizIcon, { backgroundColor: quiz.iconBg }]}>
                        <MaterialIcons name={quiz.icon} size={22} color={quiz.iconColor} />
                    </View>
                    <View style={styles.quizText}>
                        <Text style={styles.quizLabel}>{quiz.label}</Text>
                        <Text style={styles.quizTitle} numberOfLines={1}>{quiz.title}</Text>
                        <View style={styles.quizMetaRow}>
                            <Text style={styles.quizQuestions}>{quiz.questions}</Text>
                            <Text style={styles.quizAvg}>{quiz.classAvg}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.changeQuizButton} onPress={onChangeQuiz} activeOpacity={0.85}>
                    <MaterialIcons name={quiz.buttonIcon} size={16} color="#0050d4" />
                    <Text style={styles.changeQuizText}>{quiz.buttonLabel}</Text>
                </TouchableOpacity>
            </View>
        </FormSection>
    );
}

const styles = StyleSheet.create({
    resourceList: {
        gap: 10,
        marginBottom: 10,
    },
    resourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    resourceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 0,
    },
    resourceIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resourceText: {
        flex: 1,
        minWidth: 0,
    },
    resourceTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    resourceType: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    resourceSize: {
        fontFamily: 'Manrope',
        fontSize: 10,
        color: '#595c5e',
    },
    resourceName: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#2c2f31',
    },
    resourceActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    actionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#e5e9eb',
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    attachButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
    quizPanel: {
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
    },
    quizInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 200,
    },
    quizIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizText: {
        flex: 1,
        minWidth: 0,
    },
    quizLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#595c5e',
        letterSpacing: 1,
        marginBottom: 2,
    },
    quizTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 4,
    },
    quizMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quizQuestions: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        fontWeight: '600',
        color: '#0050d4',
        backgroundColor: '#d9dde0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    quizAvg: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        fontWeight: '600',
        color: '#595c5e',
    },
    changeQuizButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    changeQuizText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
    },
});
