import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ActivityCard({ item }) {
    return (
        <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: `${item.color}1a` }]}>
                <MaterialIcons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                {item.description ? (
                    <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}
                <Text style={styles.time}>{item.time}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f4',
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
    info: {
        flex: 1,
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    description: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        color: '#595c5e',
        lineHeight: 16,
        marginBottom: 3,
    },
    time: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
});