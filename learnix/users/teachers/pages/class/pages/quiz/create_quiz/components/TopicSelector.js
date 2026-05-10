import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const TOPICS = [
    'Tree Traversal',
    'Heap Implementation', 
    'Hash Tables',
    'Graph Theory',
    'Sorting Algorithms',
    'Dynamic Programming',
];

export default function TopicSelector({ selectedTopic, onSelectTopic }) {
    return (
        <View style={styles.card}>
            <Text style={styles.label}>TOPIC AREA</Text>
            <View style={styles.selectorContainer}>
                {TOPICS.map((topic) => (
                    <TouchableOpacity
                        key={topic}
                        style={[
                            styles.topicButton,
                            selectedTopic === topic && styles.selectedTopicButton
                        ]}
                        onPress={() => onSelectTopic(topic)}
                        activeOpacity={0.7}
                    >
                        <Text 
                            style={[
                                styles.topicText,
                                selectedTopic === topic && styles.selectedTopicText
                            ]}
                            numberOfLines={1}
                        >
                            {topic}
                        </Text>
                        {selectedTopic === topic && (
                            <MaterialIcons name="check" size={16} color="#ffffff" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#eef1f3',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#747779',
        marginLeft: 4,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    selectorContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    topicButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(116, 119, 121, 0.15)',
    },
    selectedTopicButton: {
        backgroundColor: '#0050d4',
        borderColor: '#0050d4',
    },
    topicText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        color: '#595c5e',
    },
    selectedTopicText: {
        fontFamily: 'Manrope-Bold',
        color: '#ffffff',
    },
});
