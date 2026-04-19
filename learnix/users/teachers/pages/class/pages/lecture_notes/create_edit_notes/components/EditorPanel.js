import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { EDITOR_TABS, EDITOR_ACTIONS } from '../constants/editorData';

export default function EditorPanel({ activeTab, onTabChange }) {
    const [content, setContent] = React.useState(
        'The shift from Theocentric (God-centered) to Anthropocentric (Human-centered) worldviews defined the Italian Renaissance.\n\nKey themes to cover in this lecture:\n• The discovery of linear perspective by Brunelleschi\n• The patronage of the Medici family in Florence\n• Humanism as an intellectual bridge to Classical antiquity\n\nNext week, we will examine how these concepts traveled North to the Netherlands and Germany.'
    );

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
                {EDITOR_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                        onPress={() => onTabChange(tab.id)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons 
                            name={tab.icon} 
                            size={16} 
                            color={activeTab === tab.id ? '#0050d4' : '#595c5e'} 
                        />
                        <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {activeTab === 'text' && (
                <>
                    <View style={styles.toolbar}>
                        {EDITOR_ACTIONS.map((action, index) => (
                            action.type === 'divider' ? (
                                <View key={index} style={styles.divider} />
                            ) : (
                                <TouchableOpacity key={action.id} style={styles.toolButton} activeOpacity={0.7}>
                                    <MaterialIcons name={action.icon} size={20} color="#595c5e" />
                                </TouchableOpacity>
                            )
                        ))}
                    </View>

                    <TextInput
                        style={styles.contentInput}
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                    />
                </>
            )}

            {activeTab === 'upload' && (
                <View style={styles.placeholderContainer}>
                    <MaterialIcons name="cloud-upload" size={48} color="#0050d4" opacity={0.3} />
                    <Text style={styles.placeholderText}>Upload lecture materials</Text>
                </View>
            )}

            {activeTab === 'links' && (
                <View style={styles.placeholderContainer}>
                    <MaterialIcons name="link" size={48} color="#0050d4" opacity={0.3} />
                    <Text style={styles.placeholderText}>Add external resource links</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e5e9eb',
        marginBottom: 16,
    },
    tabs: {
        flexDirection: 'row',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eef1f3',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#0050d4',
    },
    tabText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 13,
        fontWeight: '600',
        color: '#595c5e',
    },
    tabTextActive: {
        fontFamily: 'Manrope-Bold',
        color: '#0050d4',
        fontWeight: '700',
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        backgroundColor: '#eef1f3',
        borderRadius: 8,
        marginBottom: 16,
    },
    toolButton: {
        padding: 8,
        borderRadius: 6,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#abadaf',
        marginHorizontal: 4,
    },
    contentInput: {
        fontFamily: 'Manrope',
        fontSize: 16,
        color: '#2c2f31',
        lineHeight: 24,
        minHeight: 300,
    },
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    placeholderText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        color: '#595c5e',
        marginTop: 12,
    },
});
