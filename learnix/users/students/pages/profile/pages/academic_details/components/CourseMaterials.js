import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ACADEMIC_COLORS } from '../constants/academicData';

export default function CourseMaterials({ materials }) {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Course Material</Text>

            <View style={styles.grid}>
                {materials.map((material) => (
                    <View
                        key={material.id}
                        style={[
                            styles.materialCard,
                            { borderLeftWidth: 4, borderLeftColor: material.borderColor },
                        ]}
                    >
                        <View style={styles.header}>
                            <View style={styles.textSection}>
                                <Text style={styles.title}>{material.title}</Text>
                                <Text style={styles.due}>Due: {material.due}</Text>
                            </View>
                            <MaterialIcons
                                name={material.icon}
                                size={24}
                                color={material.iconColor}
                            />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
        marginBottom: 12,
    },
    grid: {
        gap: 10,
    },
    materialCard: {
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLow,
        padding: 14,
        borderRadius: 10,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    textSection: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
        marginBottom: 3,
        lineHeight: 17,
    },
    due: {
        fontSize: 11,
        color: ACADEMIC_COLORS.onSurfaceVariant,
        lineHeight: 15,
    },
});
