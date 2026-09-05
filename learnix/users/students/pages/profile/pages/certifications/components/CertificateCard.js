import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CERTIFICATION_COLORS } from '../constants/certificationData';

export default function CertificateCard({ certificate, onPress }) {
    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => onPress && onPress(certificate)}
        >
            {/* Image */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: certificate.image }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={styles.imageOverlay} />
                <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{certificate.category}</Text>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>{certificate.title}</Text>
                    <MaterialIcons name="verified" size={24} color={CERTIFICATION_COLORS.primary} />
                </View>

                <View style={styles.dateRow}>
                    <MaterialIcons name="calendar-today" size={14} color={CERTIFICATION_COLORS.onSurfaceVariant} />
                    <Text style={styles.date}>{certificate.date}</Text>
                </View>

                <TouchableOpacity style={styles.downloadButton} activeOpacity={0.7} onPress={() => Alert.alert('Download', `Downloading "${certificate.title}"…`)}>
                    <MaterialIcons name="download" size={18} color={CERTIFICATION_COLORS.onSurface} />
                    <Text style={styles.downloadText}>Download Certificate</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: CERTIFICATION_COLORS.surfaceContainerLowest,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
    },
    imageContainer: {
        height: 160,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    categoryBadge: {
        position: 'absolute',
        bottom: 12,
        left: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 80, 212, 0.2)',
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    content: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: CERTIFICATION_COLORS.onSurface,
        lineHeight: 22,
        marginRight: 8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    date: {
        fontSize: 12,
        fontWeight: '500',
        color: CERTIFICATION_COLORS.onSurfaceVariant,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: CERTIFICATION_COLORS.surfaceContainerLow,
        paddingVertical: 14,
        borderRadius: 16,
    },
    downloadText: {
        fontSize: 13,
        fontWeight: '700',
        color: CERTIFICATION_COLORS.onSurface,
    },
});
