import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function PublicationCard({ publication }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${publication.color}1a` }]}>
                    <MaterialIcons name="article" size={18} color={publication.color} />
                </View>
                <View style={styles.titleWrap}>
                    <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
                        {publication.title}
                    </Text>
                    <Text style={styles.meta}>
                        {publication.journal} · {publication.year}
                    </Text>
                </View>
            </View>

            <View style={styles.typeBadge}>
                <Text style={[styles.typeText, { color: publication.color }]}>{publication.type}</Text>
            </View>

            {expanded && <Text style={styles.abstract}>{publication.abstract}</Text>}

            <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setExpanded((prev) => !prev)}
                activeOpacity={0.85}
            >
                <Text style={styles.expandText}>{expanded ? 'Hide abstract' : 'View abstract'}</Text>
                <MaterialIcons
                    name={expanded ? 'expand-less' : 'expand-more'}
                    size={16}
                    color="#0050d4"
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    headRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    titleWrap: {
        flex: 1,
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        lineHeight: 18,
        marginBottom: 3,
    },
    meta: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
    },
    typeBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#eef1f3',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 8,
    },
    typeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    abstract: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        lineHeight: 18,
        color: '#595c5e',
        marginBottom: 10,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        alignSelf: 'flex-start',
    },
    expandText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
    },
});