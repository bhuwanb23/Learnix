import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { QUICK_ASSETS } from '../constants/editorData';

export default function SidebarPanel() {
    return (
        <View style={styles.container}>
            <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>Lecture Stats</Text>
                <View style={styles.statsList}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Word Count</Text>
                        <Text style={styles.statValue}>1,240</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Reading Time</Text>
                        <Text style={styles.statValue}>6 min</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Status</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>Drafting</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.assetsCard}>
                <Text style={styles.cardTitle}>Quick Assets</Text>
                <View style={styles.assetsList}>
                    {QUICK_ASSETS.map((asset) => (
                        <View key={asset.id} style={styles.assetItem}>
                            <MaterialIcons name={asset.icon} size={20} color={asset.iconColor} />
                            <View style={styles.assetInfo}>
                                <Text style={styles.assetName} numberOfLines={1}>{asset.name}</Text>
                                <Text style={styles.assetSize}>{asset.size}</Text>
                            </View>
                            <MaterialIcons name="more-vert" size={16} color="#abadaf" />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    statsCard: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    cardTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    statsList: {
        gap: 12,
    },
    statItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statLabel: {
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        color: '#595c5e',
    },
    statValue: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    statusBadge: {
        backgroundColor: 'rgba(255, 149, 106, 0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#5a1c00',
        textTransform: 'uppercase',
    },
    assetsCard: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    assetsList: {
        gap: 12,
    },
    assetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: '#f5f7f9',
        borderRadius: 8,
    },
    assetInfo: {
        flex: 1,
    },
    assetName: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
    },
    assetSize: {
        fontFamily: 'Manrope',
        fontSize: 10,
        color: '#595c5e',
    },
});
