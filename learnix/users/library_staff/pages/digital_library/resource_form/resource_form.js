import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';
import { THEME, typeMeta } from '../resourceMeta';

const TYPES = [
  { id: 'PDF', hint: 'Lecture notes, papers, handouts' },
  { id: 'EBOOK', hint: 'Technical e-books and courses' },
  { id: 'JOURNAL', hint: 'Journals and periodicals' },
];

const LICENSE_PRESETS = [
  'Campus subscription',
  'Named-user licence',
  'Open access (CC BY)',
  'Free for educational use',
  'Single-institution licence',
];

export default function ResourceForm({ navigation, route }) {
  const editingId = route?.params?.resourceId;

  const [loading, setLoading] = useState(Boolean(editingId));
  const [form, setForm] = useState({
    title: '', type: 'PDF', subject: '', publisher: '',
    license: '', externalUrl: '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const existing = await libraryApi.digitalResource(editingId);
        setForm({
          title: existing.title ?? '',
          type: existing.type ?? 'PDF',
          subject: existing.subject ?? '',
          publisher: existing.publisher ?? '',
          license: existing.license ?? '',
          externalUrl: existing.externalUrl ?? '',
          description: existing.description ?? '',
        });
      } catch (err) {
        Alert.alert('Cannot Load', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [editingId]);

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 2) next.title = 'Title must be at least 2 characters';
    if (form.externalUrl.trim() && !/^https?:\/\/.+/i.test(form.externalUrl.trim())) {
      next.externalUrl = 'Must start with http:// or https://';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      Alert.alert('Check the form', 'Some fields need attention.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        subject: form.subject.trim() || undefined,
        publisher: form.publisher.trim() || undefined,
        license: form.license.trim() || undefined,
        externalUrl: form.externalUrl.trim() || undefined,
        description: form.description.trim() || undefined,
      };

      if (editingId) {
        // Send explicit nulls on edit so clearing a field actually persists.
        await libraryApi.updateDigitalResource(editingId, {
          title: payload.title,
          type: payload.type,
          subject: payload.subject ?? null,
          publisher: payload.publisher ?? null,
          license: payload.license ?? null,
          externalUrl: payload.externalUrl ?? null,
          description: payload.description ?? null,
        });
        Alert.alert('Saved', `"${payload.title}" has been updated.`, [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        await libraryApi.addDigitalResource(payload);
        Alert.alert('Resource Added', `"${payload.title}" is now in the digital library.`, [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert(editingId ? 'Cannot Save' : 'Cannot Add', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name={editingId ? 'create-outline' : 'add-circle-outline'} size={18} color={THEME} />
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.headerTitle}>{editingId ? 'Edit resource' : 'Add a digital resource'}</Text>
            <Text style={styles.headerSub}>
              {editingId
                ? 'Update the catalog entry. Blank fields are cleared.'
                : 'Add an e-resource to the digital shelf.'}
            </Text>
          </View>
        </View>
      </AnimatedCard>

      {/* Type */}
      <AnimatedCard delay={60} style={styles.block}>
        <Text style={styles.label}>Resource Type</Text>
        {TYPES.map((t) => {
          const meta = typeMeta(t.id);
          const active = form.type === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeOption, active && { borderColor: meta.color, backgroundColor: meta.color + '08' }]}
              onPress={() => set('type', t.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.typeIcon, { backgroundColor: meta.color + '14' }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.typeLabel, active && { color: meta.color }]}>{meta.label}</Text>
                <Text style={styles.typeHint}>{t.hint}</Text>
              </View>
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={active ? meta.color : '#cbd5e1'}
              />
            </TouchableOpacity>
          );
        })}
      </AnimatedCard>

      {/* Core fields */}
      <AnimatedCard delay={120} style={styles.block}>
        <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          value={form.title}
          onChangeText={(v) => set('title', v)}
          placeholder="e.g. IEEE Xplore — CS Collection"
          placeholderTextColor="#9ca3af"
        />
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          value={form.subject}
          onChangeText={(v) => set('subject', v)}
          placeholder="e.g. Computer Science"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Publisher</Text>
        <TextInput
          style={styles.input}
          value={form.publisher}
          onChangeText={(v) => set('publisher', v)}
          placeholder="e.g. IEEE"
          placeholderTextColor="#9ca3af"
        />
      </AnimatedCard>

      {/* Access */}
      <AnimatedCard delay={180} style={styles.block}>
        <Text style={styles.label}>License</Text>
        <TextInput
          style={styles.input}
          value={form.license}
          onChangeText={(v) => set('license', v)}
          placeholder="e.g. Campus subscription 2026"
          placeholderTextColor="#9ca3af"
        />
        <View style={styles.presetRow}>
          {LICENSE_PRESETS.map((p) => (
            <TouchableOpacity key={p} style={styles.preset} onPress={() => set('license', p)} activeOpacity={0.8}>
              <Text style={styles.presetText} numberOfLines={1}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>External Link</Text>
        <TextInput
          style={[styles.input, errors.externalUrl && styles.inputError]}
          value={form.externalUrl}
          onChangeText={(v) => set('externalUrl', v)}
          placeholder="https://example.com/resource"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          keyboardType="url"
        />
        {errors.externalUrl ? <Text style={styles.errorText}>{errors.externalUrl}</Text> : null}
        <Text style={styles.hint}>Students open this link from their app. Optional.</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={(v) => set('description', v)}
          placeholder="What does this resource cover?"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
        />
      </AnimatedCard>

      <AnimatedCard delay={240} style={[styles.block, styles.footerCard]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnBusy]}
          onPress={submit}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add to Digital Library'}
          </Text>
        </TouchableOpacity>

        {!editingId && (
          <AnimatedCard delay={0} style={styles.noteBox}>
            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
              <Text style={styles.noteText}>
                New resources start as open access. Restrict them by granting access to a program or batch from the resource detail screen.
              </Text>
            </View>
          </AnimatedCard>
        )}
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  rowBody: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 16 },
  required: { color: '#dc2626' },

  header: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  headerIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerBody: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  headerSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  typeOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  typeHint: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  input: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, height: 46, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  textArea: { height: 96, paddingTop: 12 },
  errorText: { fontSize: 11, color: '#dc2626', fontFamily: 'Manrope-Medium', marginTop: 5 },
  hint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 6 },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  preset: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  presetText: { fontSize: 10, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },

  footerCard: { padding: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14 },
  saveBtnBusy: { opacity: 0.8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  noteBox: { marginTop: 14, marginBottom: 0, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});