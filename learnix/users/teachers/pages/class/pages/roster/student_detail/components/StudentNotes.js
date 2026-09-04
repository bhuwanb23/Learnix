import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function StudentNotes({ note }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [savedNote, setSavedNote] = useState(note || '');

    const handleSave = () => {
        if (draft.trim().length > 0) {
            setSavedNote(draft.trim());
        }
        setEditing(false);
        setDraft('');
    };

    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <Text style={styles.title}>Teacher Notes</Text>
                {!editing && (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setEditing(true)}
                        activeOpacity={0.85}
                    >
                        <MaterialIcons name="add" size={16} color="#0050d4" />
                        <Text style={styles.addText}>Add Note</Text>
                    </TouchableOpacity>
                )}
            </View>

            {editing ? (
                <View>
                    <TextInput
                        style={styles.input}
                        placeholder="Write a note about this student…"
                        placeholderTextColor="#8a8f94"
                        value={draft}
                        onChangeText={setDraft}
                        multiline
                    />
                    <View style={styles.editActions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setEditing(false);
                                setDraft('');
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
                            <Text style={styles.saveText}>Save Note</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <Text style={styles.noteText}>{savedNote || 'No notes yet for this student.'}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 24,
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#e8efff',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    addText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
    },
    noteText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        lineHeight: 20,
        color: '#595c5e',
    },
    input: {
        minHeight: 80,
        backgroundColor: '#f5f7f9',
        borderRadius: 10,
        padding: 12,
        fontFamily: 'Manrope-Medium',
        fontSize: 13,
        color: '#2c2f31',
        textAlignVertical: 'top',
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 12,
    },
    cancelButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    cancelText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#8a8f94',
    },
    saveButton: {
        backgroundColor: '#0050d4',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    saveText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
});