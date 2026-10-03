import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';
import { THEME, audienceMeta, BROADCAST_TEMPLATES, TITLE_LIMIT, BODY_LIMIT } from '../notificationMeta';

const AUDIENCES = ['ALL_STUDENTS', 'BORROWERS', 'OVERDUE_MEMBERS'];

export default function ComposeBroadcast({ navigation }) {
  const [audiences, setAudiences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState('ALL_STUDENTS');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const result = await libraryApi.broadcastAudiences();
        setAudiences(result.audiences || []);
      } catch (err) {
        Alert.alert('Cannot Load Audiences', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key, value) => {
    if (key === 'title') setTitle(value);
    if (key === 'body') setBody(value);
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const selected = audiences?.find((a) => a.id === audience);
  const recipients = selected?.recipients ?? 0;
  const meta = audienceMeta(audience);

  const applyTemplate = (t) => {
    setTitle(t.title);
    setBody(t.body);
    setErrors({});
  };

  const validate = () => {
    const next = {};
    if (title.trim().length < 2) next.title = 'Add a subject of at least 2 characters';
    if (title.length > TITLE_LIMIT) next.title = `Keep the subject under ${TITLE_LIMIT} characters`;
    if (body.trim().length < 2) next.body = 'Write the announcement message';
    if (body.length > BODY_LIMIT) next.body = `Keep the message under ${BODY_LIMIT} characters`;
    if (recipients === 0) next.audience = 'This audience has no students right now';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const send = () => {
    if (!validate()) {
      Alert.alert('Check the message', 'Some fields need attention before sending.');
      return;
    }
    setSending(true);
    libraryApi
      .sendBroadcast({ audience, title: title.trim(), body: body.trim() })
      .then((result) => {
        Alert.alert(
          'Broadcast Sent',
          `"${result.title ?? title.trim()}" reached ${result.recipients} student${result.recipients === 1 ? '' : 's'}.`,
          [
            {
              text: 'View History',
              onPress: () => navigation.openModule('BroadcastHistory'),
            },
            { text: 'Done', onPress: () => navigation.goBack() },
          ],
        );
      })
      .catch((err) => Alert.alert('Cannot Send', err.message))
      .finally(() => setSending(false));
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
      {/* Audience */}
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="megaphone-outline" size={18} color={THEME} />
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.headerTitle}>Who should receive this?</Text>
            <Text style={styles.headerSub}>Counts are live — you will see the reach before sending.</Text>
          </View>
        </View>

        {audiences?.map((a) => {
          const m = audienceMeta(a.id);
          const active = audience === a.id;
          return (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.audienceOption,
                active && { borderColor: m.color, backgroundColor: m.bg },
                errors.audience && a.id === audience && styles.optionError,
              ]}
              onPress={() => set('audience', a.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.audienceIcon, { backgroundColor: active ? m.color : m.bg }]}>
                <Ionicons name={m.icon} size={17} color={active ? '#fff' : m.color} />
              </View>
              <View style={styles.headerBody}>
                <Text style={[styles.audienceLabel, active && { color: m.color }]}>{a.label}</Text>
                <Text style={styles.audienceDesc}>{a.description}</Text>
              </View>
              <View style={styles.reachBox}>
                <Text style={[styles.reachValue, { color: a.recipients === 0 ? '#cbd5e1' : m.color }]}>
                  {a.recipients}
                </Text>
                <Text style={styles.reachLabel}>recipients</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {errors.audience ? <Text style={styles.errorText}>{errors.audience}</Text> : null}
      </AnimatedCard>

      {/* Templates */}
      <AnimatedCard delay={60} style={styles.block}>
        <Text style={styles.label}>Start From a Template</Text>
        <View style={styles.templateRow}>
          {BROADCAST_TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.template}
              onPress={() => applyTemplate(t)}
              activeOpacity={0.8}
            >
              <Text style={styles.templateText} numberOfLines={2}>{t.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </AnimatedCard>

      {/* Message */}
      <AnimatedCard delay={120} style={styles.block}>
        <View style={styles.labelRow}>
          <Text style={styles.labelNoMargin}>Subject</Text>
          <Text style={[styles.counter, errors.title && { color: '#dc2626' }]}>
            {title.length}/{TITLE_LIMIT}
          </Text>
        </View>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          value={title}
          onChangeText={(v) => set('title', v)}
          placeholder="e.g. Extended hours during exams"
          placeholderTextColor="#9ca3af"
          maxLength={TITLE_LIMIT}
        />
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

        <View style={styles.labelRow}>
          <Text style={styles.labelNoMargin}>Message</Text>
          <Text style={[styles.counter, errors.body && { color: '#dc2626' }]}>
            {body.length}/{BODY_LIMIT}
          </Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea, errors.body && styles.inputError]}
          value={body}
          onChangeText={(v) => set('body', v)}
          placeholder="Write the announcement students will see in their app…"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          maxLength={BODY_LIMIT}
        />
        {errors.body ? <Text style={styles.errorText}>{errors.body}</Text> : null}
      </AnimatedCard>

      {/* Summary */}
      <AnimatedCard delay={180} style={[styles.block, styles.summaryCard]}>
        <View style={styles.summaryRow}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
          <Text style={styles.summaryLabel}>Audience</Text>
          <Text style={[styles.summaryValue, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Ionicons name="people-outline" size={16} color="#64748b" />
          <Text style={styles.summaryLabel}>Will reach</Text>
          <Text style={[styles.summaryValue, recipients === 0 && { color: '#cbd5e1' }]}>
            {recipients} student{recipients === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Ionicons name="notifications-outline" size={16} color="#64748b" />
          <Text style={styles.summaryLabel}>Channel</Text>
          <Text style={styles.summaryValue}>In-app</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.sendBtn,
            (sending || recipients === 0) && styles.sendBtnDisabled,
          ]}
          onPress={send}
          activeOpacity={0.85}
          disabled={sending || recipients === 0}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={17} color="#fff" />}
          <Text style={styles.sendBtnText}>
            {recipients === 0
              ? 'No Recipients'
              : sending
                ? 'Sending…'
                : `Send to ${recipients} Student${recipients === 1 ? '' : 's'}`}
          </Text>
        </TouchableOpacity>
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  headerBody: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  headerSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  audienceOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8 },
  optionError: { borderColor: '#fca5a5' },
  audienceIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  audienceLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  audienceDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  reachBox: { alignItems: 'flex-end', marginLeft: 8 },
  reachValue: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  reachLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  labelNoMargin: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 16 },
  counter: { fontSize: 10, color: '#cbd5e1', fontFamily: 'Manrope-Medium' },

  templateRow: { gap: 7 },
  template: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  templateText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 15 },

  input: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, height: 46, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  textArea: { height: 120, paddingTop: 12 },
  errorText: { fontSize: 11, color: '#dc2626', fontFamily: 'Manrope-Medium', marginTop: 5 },

  summaryCard: { padding: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  summaryLabel: { flex: 1, fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  summaryDivider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 11 },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
});