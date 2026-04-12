import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { CONFIRMATION_COLORS, TICKET_DATA } from '../constants/confirmationData';

export default function TicketCard({ ticket = TICKET_DATA }) {
    return (
        <View style={styles.container}>
            {/* Ticket Header */}
            <LinearGradient
                colors={[CONFIRMATION_COLORS.primary, CONFIRMATION_COLORS.primaryDim]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerLabel}>Admissions Pass</Text>
                        <Text style={styles.headerTitle}>{ticket.eventName}</Text>
                    </View>
                    <MaterialIcons name="confirmation-number" size={28} color={CONFIRMATION_COLORS.onPrimary} />
                </View>
            </LinearGradient>

            {/* Ticket Content */}
            <View style={styles.content}>
                {/* Student Info Grid */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Student Name</Text>
                        <Text style={styles.infoValue}>{ticket.studentName}</Text>
                    </View>
                    <View style={[styles.infoItem, styles.infoItemRight]}>
                        <Text style={styles.infoLabel}>Seat Number</Text>
                        <Text style={styles.infoValue}>{ticket.seatNumber}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Event Date</Text>
                        <Text style={styles.infoValue}>{ticket.eventDate}</Text>
                    </View>
                    <View style={[styles.infoItem, styles.infoItemRight]}>
                        <Text style={styles.infoLabel}>Time</Text>
                        <Text style={styles.infoValue}>{ticket.eventTime}</Text>
                    </View>
                </View>

                {/* Perforation Line */}
                <View style={styles.perforation}>
                    <View style={styles.perforationLine} />
                    <View style={styles.perforationHoleLeft} />
                    <View style={styles.perforationHoleRight} />
                </View>

                {/* QR Code */}
                <View style={styles.qrContainer}>
                    <Image
                        source={{ uri: ticket.qrCode }}
                        style={styles.qrCode}
                    />
                </View>
                <Text style={styles.ticketId}>TICKET ID: {ticket.ticketId}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        marginHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    header: {
        padding: 16,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: CONFIRMATION_COLORS.onPrimary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.8,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: CONFIRMATION_COLORS.onPrimary,
    },
    content: {
        backgroundColor: CONFIRMATION_COLORS.surfaceContainerLowest + '66',
        padding: 20,
        alignItems: 'center',
        gap: 16,
    },
    infoGrid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    infoItem: {
        flex: 1,
        minWidth: '40%',
        gap: 4,
    },
    infoItemRight: {
        alignItems: 'flex-end',
    },
    infoLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: CONFIRMATION_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: CONFIRMATION_COLORS.onBackground,
    },
    perforation: {
        width: '100%',
        borderTopWidth: 2,
        borderTopColor: CONFIRMATION_COLORS.outlineVariant + '4D',
        borderStyle: 'dashed',
        paddingVertical: 8,
        position: 'relative',
    },
    perforationHoleLeft: {
        position: 'absolute',
        left: -24,
        top: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: CONFIRMATION_COLORS.surface,
    },
    perforationHoleRight: {
        position: 'absolute',
        right: -24,
        top: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: CONFIRMATION_COLORS.surface,
    },
    qrContainer: {
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: CONFIRMATION_COLORS.outlineVariant + '1A',
    },
    qrCode: {
        width: 100,
        height: 100,
    },
    ticketId: {
        fontSize: 10,
        fontWeight: '600',
        fontFamily: 'monospace',
        color: CONFIRMATION_COLORS.onSurfaceVariant,
        letterSpacing: 2,
    },
});
