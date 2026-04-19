import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditorHeader from './components/EditorHeader';
import MetadataSection from './components/MetadataSection';
import EditorPanel from './components/EditorPanel';
import SidebarPanel from './components/SidebarPanel';
import { HEADER } from './constants/editorData';

export default function CreateEditNotes({ route, navigation }) {
    const topicData = route?.params?.topicData || {
        id: 'topic-1',
        title: 'Quantum Mechanics 101',
    };

    const [title, setTitle] = useState(topicData.title || 'Renaissance Art & Modernity');
    const [description, setDescription] = useState('Exploring the transition from medieval symbolism to human-centric perspectives in 15th-century Florence.');
    const [activeTab, setActiveTab] = useState('text');

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handlePreview = () => {
        console.log('Preview notes');
    };

    const handleUpdate = () => {
        console.log('Update notes');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <EditorHeader 
                    title={HEADER.title} 
                    onBack={handleBack}
                    onPreview={handlePreview}
                    onUpdate={handleUpdate}
                />
                <View style={styles.content}>
                    <MetadataSection
                        title={title}
                        description={description}
                        onTitleChange={setTitle}
                        onDescriptionChange={setDescription}
                    />
                    <EditorPanel activeTab={activeTab} onTabChange={setActiveTab} />
                    <SidebarPanel />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollContent: {
        paddingBottom: 32,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
});