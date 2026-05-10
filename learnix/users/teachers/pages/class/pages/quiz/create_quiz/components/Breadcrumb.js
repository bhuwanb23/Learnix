import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function Breadcrumb({ items }) {
    return (
        <View style={styles.container}>
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <MaterialIcons name="chevron-right" size={14} color="#747779" />
                    )}
                    <Text 
                        style={[
                            styles.text,
                            index === items.length - 1 && styles.activeText
                        ]}
                    >
                        {item}
                    </Text>
                </React.Fragment>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 24,
    },
    text: {
        fontFamily: 'Manrope',
        fontSize: 11,
        color: '#747779',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    activeText: {
        color: '#2c2f31',
    },
});
