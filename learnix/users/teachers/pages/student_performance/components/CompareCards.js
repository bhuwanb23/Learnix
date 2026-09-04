import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function CompareCards({ classCompare, subjectCompare, onPress }) {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.card}
                onPress={() => onPress('class')}
                activeOpacity={0.85}
            >
                <View style={[styles.iconWrap, { backgroundColor: `${classCompare.color}1a` }]}>
                    <MaterialIcons name="account-tree" size={20} color={classCompare.color} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.title}>{classCompare.title}</Text>
                    <Text style={styles.subtitle}>{classCompare.subtitle}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.card}
                onPress={() => onPress('subject')}
                activeOpacity={0.85}
            >
                <View style={[styles.iconWrap, { backgroundColor: `${subjectCompare.color}1a` }]}>
                    <MaterialIcons name="school" size={20} color={subjectCompare.color} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.title}>{subjectCompare.title}</Text>
                    <Text style={styles.subtitle}>{subjectCompare.subtitle}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    subtitle: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
    },
});