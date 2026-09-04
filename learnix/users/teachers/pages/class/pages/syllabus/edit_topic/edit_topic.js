import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditorHeader from './components/EditorHeader';
import EditorTitleBar from './components/EditorTitleBar';
import StatusSelector from './components/StatusSelector';
import BasicInfoSection from './components/BasicInfoSection';
import CurriculumSection from './components/CurriculumSection';
import MaterialsSection from './components/MaterialsSection';
import DeliverySection from './components/DeliverySection';
import VisualAssetCard from './components/VisualAssetCard';
import EditorActionBar from './components/EditorActionBar';
import {
    HEADER,
    BREADCRUMB,
    MODULE_PILL,
    DEFAULT_TOPIC,
    SAVE_STATUS,
    STATUS_TABS,
    SECTION_1,
    BASIC_INFO,
    SECTION_2,
    CURRICULUM,
    SECTION_3,
    RESOURCES,
    LINKED_QUIZ,
    SECTION_4,
    DELIVERY,
    VISUAL_ASSET,
} from './constants/topicEditorData';

export default function EditTopic({ route, navigation }) {
    const topicData = route?.params?.topicData || null;
    const unitData = route?.params?.unitData || null;

    const editorTitle = topicData?.title
        ? `Edit Topic: ${topicData.title}`
        : (unitData ? `Edit Topic for Unit ${unitData.number || '02'}` : DEFAULT_TOPIC.title);

    const [status, setStatus] = useState('In Progress');
    const [title, setTitle] = useState(BASIC_INFO.title.value);
    const [code, setCode] = useState(BASIC_INFO.code.value);
    const [duration, setDuration] = useState(BASIC_INFO.duration.value);
    const [description, setDescription] = useState(BASIC_INFO.description.value);
    const [bloom, setBloom] = useState(CURRICULUM.bloomDefault);
    const [difficulty, setDifficulty] = useState(CURRICULUM.difficultyDefault);
    const [weights, setWeights] = useState(
        CURRICULUM.weightOptions.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.checked }), {})
    );
    const [date, setDate] = useState(DELIVERY.date.value);
    const [room, setRoom] = useState(DELIVERY.room.value);
    const [privateNotes, setPrivateNotes] = useState(DELIVERY.privateNotes.value);
    const [saving, setSaving] = useState(false);

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handlePublish = () => {
        console.log('Publish unit');
    };

    const handleWeightToggle = (id) => {
        setWeights((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Topic?',
            'This will permanently remove the topic from the syllabus unit.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        handleBack();
                    },
                },
            ]
        );
    };

    const handleSaveDraft = () => {
        Alert.alert('Draft Saved', 'Your changes have been saved as a draft.');
    };

    const handleUpdate = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            Alert.alert('Topic Updated', 'The topic changes were saved and synced.');
        }, 700);
    };

    const handleResourceAction = (action, resource) => {
        console.log('Resource action:', action, resource?.fileName);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <EditorHeader header={HEADER} onBack={handleBack} onPublish={handlePublish} />
                <EditorTitleBar
                    breadcrumb={BREADCRUMB}
                    modulePill={MODULE_PILL}
                    title={editorTitle}
                    saveStatus={SAVE_STATUS}
                />
                <StatusSelector tabs={STATUS_TABS} value={status} onChange={setStatus} />

                <BasicInfoSection
                    section={SECTION_1}
                    data={BASIC_INFO}
                    title={title}
                    code={code}
                    duration={{ ...BASIC_INFO.duration, value: duration }}
                    description={description}
                    onTitleChange={setTitle}
                    onCodeChange={setCode}
                    onDurationChange={setDuration}
                    onDescriptionChange={setDescription}
                />

                <CurriculumSection
                    section={SECTION_2}
                    data={CURRICULUM}
                    bloom={bloom}
                    difficulty={difficulty}
                    weights={weights}
                    onBloomChange={setBloom}
                    onDifficultyChange={setDifficulty}
                    onWeightToggle={handleWeightToggle}
                />

                <MaterialsSection
                    section={SECTION_3}
                    resources={RESOURCES}
                    quiz={LINKED_QUIZ}
                    onReplace={(r) => handleResourceAction('replace', r)}
                    onRemove={(r) => handleResourceAction('remove', r)}
                    onAttach={() => console.log('Attach new document')}
                    onChangeQuiz={() => console.log('Change quiz')}
                />

                <DeliverySection
                    section={SECTION_4}
                    data={DELIVERY}
                    date={date}
                    room={room}
                    privateNotes={privateNotes}
                    onDateChange={setDate}
                    onRoomChange={setRoom}
                    onPrivateNotesChange={setPrivateNotes}
                />

                <VisualAssetCard asset={VISUAL_ASSET} />
            </ScrollView>

            <EditorActionBar
                saving={saving}
                onDelete={handleDelete}
                onSaveDraft={handleSaveDraft}
                onUpdate={handleUpdate}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
});
