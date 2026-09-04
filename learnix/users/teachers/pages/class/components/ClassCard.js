import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');
const cardWidth = width - 48; // Full width minus padding

export default function ClassCard({ classData, onViewPress, onUploadPress, onMorePress }) {
    return (
        <View style={styles.card}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.titleSection}>
                    <Text style={[styles.code, { color: classData.color + 'b3' }]}>{classData.code}</Text>
                    <Text
                        style={[styles.title, { color: classData.color }]}
                        numberOfLines={2}
                    >
                        {classData.title}
                    </Text>
                </View>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.7} onPress={onMorePress}>
                    <MaterialIcons name="more-vert" size={20} color="#595c5e" />
                </TouchableOpacity>
            </View>

            {/* Info Badges */}
            <View style={styles.badges}>
                <View style={styles.badge}>
                    <MaterialIcons name="group" size={16} color="#595c5e" />
                    <Text style={styles.badgeText}>{classData.students} Students</Text>
                </View>
                <View style={styles.badge}>
                    <MaterialIcons name="calendar-today" size={16} color="#595c5e" />
                    <Text style={styles.badgeText}>{classData.schedule}</Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.viewButton, { backgroundColor: classData.color }]}
                    activeOpacity={0.85}
                    onPress={onViewPress}
                >
                    <MaterialIcons name="mail" size={16} color="#ffffff" />
                    <Text style={styles.viewButtonText}>View Class</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.uploadButton}
                    activeOpacity={0.85}
                    onPress={onUploadPress}
                >
                    <MaterialIcons name="cloud-upload" size={20} color="#2c2f31" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    titleSection: {
        flex: 1,
        marginRight: 8,
    },
    code: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 22,
        fontWeight: '800',
        lineHeight: 28,
        letterSpacing: -0.3,
    },
    moreButton: {
        padding: 8,
        backgroundColor: '#eef1f3',
        borderRadius: 8,
    },
    badges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eef1f3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    badgeText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        fontWeight: '500',
        color: '#595c5e',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e9eb80',
    },
    viewButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    viewButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
    uploadButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#dfe3e6',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
