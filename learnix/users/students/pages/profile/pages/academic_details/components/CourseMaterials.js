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
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
        marginBottom: 12,
    },
    grid: {
        gap: 12,
    },
    materialCard: {
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLow,
        padding: 16,
        borderRadius: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textSection: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
        marginBottom: 4,
    },
    due: {
        fontSize: 12,
        color: ACADEMIC_COLORS.onSurfaceVariant,
    },
});
