import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuizHeader({ breadcrumb, title, subtitle }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerContent}>
                <View style={styles.breadcrumb}>
                    {breadcrumb.map((item, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && (
                                <MaterialIcons name="chevron-right" size={14} color="#595c5e" />
                            )}
                            <Text style={[
                                styles.breadcrumbText,
                                index === breadcrumb.length - 1 && styles.breadcrumbActive
                            ]}>
                                {item}
                            </Text>
                        </React.Fragment>
                    ))}
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#747779" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search units or topics..."
                    placeholderTextColor="#abadaf"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
    },
    headerContent: {
        marginBottom: 20,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    breadcrumbText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        fontWeight: '500',
        color: '#595c5e',
    },
    breadcrumbActive: {
        color: '#2c2f31',
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 28,
        fontWeight: '800',
        color: '#2c2f31',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#595c5e',
        lineHeight: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#2c2f31',
    },
});
