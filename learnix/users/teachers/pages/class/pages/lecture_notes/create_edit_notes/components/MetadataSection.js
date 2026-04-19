import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

export default function MetadataSection({ title, description, onTitleChange, onDescriptionChange }) {
    return (
        <View style={styles.container}>
            <TextInput
                style={styles.titleInput}
                placeholder="Enter Lecture Title..."
                placeholderTextColor="#595c5e"
                value={title}
                onChangeText={onTitleChange}
                multiline
            />
            <TextInput
                style={styles.descriptionInput}
                placeholder="Write a short description of this lecture..."
                placeholderTextColor="#595c5e"
                value={description}
                onChangeText={onDescriptionChange}
                multiline
                textAlignVertical="top"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    titleInput: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 28,
        fontWeight: '800',
        color: '#2c2f31',
        marginBottom: 12,
        padding: 0,
    },
    descriptionInput: {
        fontFamily: 'Manrope',
        fontSize: 16,
        color: '#595c5e',
        lineHeight: 24,
        padding: 0,
        minHeight: 48,
    },
});
