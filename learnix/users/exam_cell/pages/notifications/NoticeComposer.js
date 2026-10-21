/**
 * X-09 — The examination notice composer.
 * Docs: 05-exam-cell.md §3.7
 *
 * WHY IT IS ITS OWN COMPONENT
 * ---------------------------
 * The screen was 534 lines, and the composer is a self-contained thing: a modal with an audience
 * picker, a subject, a message and an "important" switch. Pulling it out leaves the inbox screen
 * about the INBOX, which is what it is for.
 *
 * IMPORTANT NOTICES IGNORE MUTES
 * ------------------------------
 * A reader who muted a category gets no row at all for it — the mute is SUPPRESSION, not hiding.
 * But an IMPORTANT notice is a notice the office marked as needing attention, so it bypasses the
 * mute. That is why the composer says so out loud, on the control itself, and not only in a
 * comment: a switch whose consequence is invisible is a switch nobody can use correctly.
 *
 * ONLY THE OFFICE COMPOSES
 * ------------------------
 * IMPORTANT_NOTICE is the one thing the exam office composes. The other eight categories are facts
 * the SYSTEM reports, and a controller who could publish a RESULT_PUBLISHED would be able to forge
 * a result — so the screen says so, and the server refuses it.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../services/api';
import { FALLBACK_AUDIENCES, styles } from './notificationsUi';

export default function NoticeComposer({ visible, audiences, onClose, onSent }) {
  const [audience, setAudience] = useState('ALL_STUDENTS');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(true);
  const [sending, setSending] = useState(false);

  const list = audiences && audiences.length ? audiences : FALLBACK_AUDIENCES;

  const send = async () => {
    if (title.trim().length < 3 || body.trim().length < 3) {
      Alert.alert('Almost there', 'Give it a subject and a message of at least three characters.');
      return;
    }
    setSending(true);
    try {
      const res = await examcellApi.broadcast({
        audience,
        title: title.trim(),
        body: body.trim(),
        important,
      });
      setTitle('');
      setBody('');
      setImportant(true);
      setAudience('ALL_STUDENTS');
      onClose();
      Alert.alert(
        'Sent',
        `${res?.recipients ?? 0} recipient(s) notified${
          res?.muted ? `, ${res.muted} had muted notices` : ''
        }.`,
      );
      onSent?.();
    } catch (e) {
      Alert.alert('Could not send', e.message || 'Try again');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>Compose an examination notice</Text>
        <Text style={styles.sub}>
          An important notice is the only thing the exam office composes. The other eight categories
          are reported by the system, and a controller who could publish a result could forge one.
        </Text>

        <Text style={styles.label}>Who is it for?</Text>
        <View style={styles.chipRow}>
          {list.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.chip, audience === a.id && styles.chipOn]}
              onPress={() => setAudience(a.id)}
            >
              <Text style={[styles.chipText, audience === a.id && styles.chipTextOn]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Examination venue change for the 6th semester"
          placeholderTextColor="#94a3b8"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.inputTall]}
          placeholder="What do they need to know, and what should they do?"
          placeholderTextColor="#94a3b8"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
        />

        <TouchableOpacity style={styles.importantRow} onPress={() => setImportant((v) => !v)}>
          <Ionicons
            name={important ? 'checkbox' : 'square-outline'}
            size={20}
            color={important ? '#dc2626' : '#94a3b8'}
          />
          <View style={styles.flex}>
            <Text style={[styles.importantLabel, important && { color: '#dc2626' }]}>
              Mark as important
            </Text>
            <Text style={styles.importantHint}>
              An important notice reaches everyone even if they muted notices — it ignores the
              mutes. Use it for something they must act on.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendOff]}
          onPress={send}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}
