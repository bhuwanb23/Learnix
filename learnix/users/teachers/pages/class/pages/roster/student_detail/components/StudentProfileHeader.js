import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STATUS_META } from '../../roster_list/constants/rosterData';

export default function StudentProfileHeader({ student, onBack }) {
    const insets = useSafeAreaInsets();
    const status = STATUS_META[student.status] || STATUS_META.present;

    return (
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.85}>
                <MaterialIcons name="arrow-back" size={22} color="#2c2f31" />
            </TouchableOpacity>

            <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
                <Text style={[styles.avatarText, { color: student.avatarText }]}>{student.id}</Text>
            </View>

            <Text style={styles.name}>{student.name}</Text>
            <Text style={styles.studentId}>ID: {student.studentId}</Text>

            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <MaterialIcons name={status.icon} size={13} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>{status.label} today</Text>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.85}
                    onPress={() => Alert.alert('Message Student', `A direct message thread with ${student.name} will open here.`)}
                >
                    <MaterialIcons name="message" size={18} color="#0050d4" />
                    <Text style={styles.actionText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.85}
                    onPress={() => Alert.alert('Call Student', `A call to ${student.name} will be placed from the registered guardian number.`)}
                >
                    <MaterialIcons name="phone" size={18} color="#0050d4" />
                    <Text style={styles.actionText}>Call</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 28,
        fontWeight: '700',
    },
    name: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 4,
    },
    studentId: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        color: '#8a8f94',
        marginBottom: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 18,
    },
    statusText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#e8efff',
        borderRadius: 10,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    actionText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
});