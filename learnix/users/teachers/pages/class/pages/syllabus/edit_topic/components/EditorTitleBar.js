import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function EditorTitleBar({ breadcrumb, modulePill, title, saveStatus }) {
    return (
        <View style={styles.container}>
            {/* Breadcrumb */}
            <View style={styles.breadcrumb}>
                {breadcrumb.map((item, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <MaterialIcons name="chevron-right" size={14} color="#595c5e" />}
                        <Text
                            style={[
                                styles.breadcrumbText,
                                index === breadcrumb.length - 1 && styles.breadcrumbActive,
                            ]}
                        >
                            {item}
                        </Text>
                    </React.Fragment>
                ))}
            </View>

            <View style={styles.headlineRow}>
                <View style={styles.headlineBlock}>
                    <View style={styles.modulePill}>
                        <MaterialIcons name={modulePill.icon} size={13} color="#5b00c7" />
                        <Text style={styles.modulePillText}>{modulePill.label}</Text>
                    </View>
                    <Text style={styles.title}>{title}</Text>
                </View>
                <View style={styles.autosaveBadge}>
                    <MaterialIcons name={saveStatus.icon} size={16} color="#0050d4" />
                    <Text style={styles.autosaveText}>{saveStatus.label}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
        marginBottom: 16,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    breadcrumbText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    breadcrumbActive: {
        fontFamily: 'Manrope-SemiBold',
        fontWeight: '600',
        color: '#0050d4',
    },
    headlineRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    headlineBlock: {
        flex: 1,
    },
    modulePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#dcc9ff',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 9999,
        marginBottom: 6,
    },
    modulePillText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#5b00c7',
        letterSpacing: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 24,
        fontWeight: '800',
        color: '#2c2f31',
        letterSpacing: -0.6,
        lineHeight: 30,
    },
    autosaveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#e5e9eb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    autosaveText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
});
