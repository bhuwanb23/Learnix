import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VIEW_PROFILE_COLORS } from '../constants/viewProfileData';
import ProfileInfoRow from './ProfileInfoRow';

export default function ProfileSection({ section, onItemPress }) {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionWrapper}>
                <View style={styles.sectionInner}>
                    {section.items.map((item, index) => (
                        <View
                            key={item.id}
                            style={[
                                styles.itemWrapper,
                                index < section.items.length - 1 && styles.itemBorder,
                            ]}
                        >
                            <ProfileInfoRow
                                item={item}
                                onPress={() => onItemPress && onItemPress(item)}
                            />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: VIEW_PROFILE_COLORS.outline,
        textTransform: 'uppercase',
        letterSpacing: 2,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 8,
    },
    sectionWrapper: {
        backgroundColor: VIEW_PROFILE_COLORS.surfaceContainerLow,
        padding: 4,
        borderRadius: 12,
    },
    sectionInner: {
        backgroundColor: VIEW_PROFILE_COLORS.surfaceContainerLowest,
        borderRadius: 12,
        overflow: 'hidden',
    },
    itemWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: VIEW_PROFILE_COLORS.surfaceContainer,
    },
    itemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: VIEW_PROFILE_COLORS.surfaceContainer,
    },
});
