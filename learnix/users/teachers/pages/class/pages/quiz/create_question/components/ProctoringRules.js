import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const RULES = [
    { text: 'Camera Monitoring Active', enabled: true },
    { text: 'Browser Lockdown Enabled', enabled: true },
    { text: 'Multiple Attempts Disabled', enabled: false },
];

export default function ProctoringRules({ rules = RULES }) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="warning" size={20} color="#a23800" />
                <Text style={styles.title}>Proctoring Rules</Text>
            </View>
            
            <View style={styles.rulesList}>
                {rules.map((rule, index) => (
                    <View key={index} style={styles.ruleItem}>
                        <MaterialIcons 
                            name={rule.enabled ? "check-circle" : "cancel"} 
                            size={14} 
                            color={rule.enabled ? "#0050d4" : "#abadaf"} 
                        />
                        <Text style={[
                            styles.ruleText,
                            !rule.enabled && styles.disabledRuleText
                        ]}>
                            {rule.text}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(116, 119, 121, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    title: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 12,
        fontWeight: '800',
        color: '#2c2f31',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    rulesList: {
        gap: 12,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    ruleText: {
        fontFamily: 'Manrope',
        fontSize: 13,
        color: '#595c5e',
    },
    disabledRuleText: {
        color: '#abadaf',
    },
});
