import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { alumniApi } from '../../../../../services/api';
import { SearchBar, SkeletonCard } from '../../../../../components/ui';
import { MentorCard, NoData } from '../../../components/MentorCard';
import { MENTORSHIP_FIELDS } from '../../../mentorshipMeta';

/**
 * The mentor directory.
 *
 * Two modes:
 *   browse      → everyone available to mentor, filterable by skill and field
 *   forRequest  → RANKED matches with the reason each one was chosen
 *
 * The ranked mode is the answer to "skill-based / career-based matching", and it
 * only makes sense relative to a mentee, so it is opened from a request. Each
 * candidate shows WHY — a recommendation the mentee cannot explain is one they
 * will not use.
 */
export default function MentorshipDirectory({ navigation, onRequested }) {
  const [mode, setMode] = useState('browse');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requesting, setRequesting] = useState(null);
  const [form, setForm] = useState({ skills: '', message: '', field: MENTORSHIP_FIELDS[0] });
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        setData(await alumniApi.mentorDirectory({ skill: skillFilter ?? undefined }));
        if (requests.length === 0) {
          const r = await alumniApi.mentorshipRequests({ status: 'PENDING' });
          setRequests(r.requests ?? []);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [skillFilter, requests.length],
  );

  useEffect(() => {
    load();
  }, [load]);

  const mentors = (data?.mentors ?? []).filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.role ?? '').toLowerCase().includes(q) ||
      (m.company ?? '').toLowerCase().includes(q) ||
      (m.headline ?? '').toLowerCase().includes(q) ||
      m.skills.some((s) => s.skill.toLowerCase().includes(q))
    );
  });

  /** Every distinct skill in the pool, so the filter chips come from real data. */
  const allSkills = [...new Set((data?.mentors ?? []).flatMap((m) => m.skills.map((s) => s.skill)))].sort();

  const submitRequest = async () => {
    if (!form.skills.trim() && !form.message.trim()) {
      Alert.alert('Add a little more', 'Say which skill you want help with, or why you are asking.');
      return;
    }
    try {
      setBusy(true);
      await alumniApi.requestMentor({
        requestedSkills: form.skills.trim() || undefined,
        message: form.message.trim() || undefined,
        field: form.field,
        mentorUserId: requesting.userId,
      });
      setRequesting(null);
      setForm({ skills: '', message: '', field: MENTORSHIP_FIELDS[0] });
      Alert.alert('Request sent', `${requesting.name} has been asked to mentor you.`);
      onRequested?.();
    } catch (e) {
      Alert.alert('Cannot send request', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
          <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Find a mentor</Text>
          <Text style={styles.sub}>{mentors.length} available</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search name, role, skill…" onSearch={setQuery} />
      </View>

      {requests.length > 0 ? (
        <TouchableOpacity style={styles.rankBanner} onPress={() => setMode(mode === 'rank' ? 'browse' : 'rank')}>
          <Ionicons name="sparkles" size={15} color="#7c3aed" />
          <Text style={styles.rankBannerText}>
            {mode === 'rank'
              ? 'Showing everyone — tap for ranked matches'
              : `Rank matches for your request (${requests[0].requestedSkills ?? 'career advice'})`}
          </Text>
          <Ionicons name={mode === 'rank' ? 'list-outline' : 'chevron-forward'} size={14} color="#7c3aed" />
        </TouchableOpacity>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipWrap} contentContainerStyle={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, skillFilter === null && styles.chipActive]}
          onPress={() => setSkillFilter(null)}
        >
          <Text style={[styles.chipText, skillFilter === null && styles.chipTextActive]}>All skills</Text>
        </TouchableOpacity>
        {allSkills.slice(0, 20).map((s) => {
          const active = skillFilter === s;
          return (
            <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => setSkillFilter(active ? null : s)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && !data ? (
        <View style={{ paddingHorizontal: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
            />
          }
        >
          {mode === 'rank' && requests[0] ? (
            <RankedMatches requestId={requests[0].id} onRequest={(m) => setRequesting(m)} />
          ) : (
            mentors.map((m) => (
              <MentorCard key={m.profileId} mentor={m} onRequest={(mentor) => setRequesting(mentor)} />
            ))
          )}

          {mentors.length === 0 && mode !== 'rank' ? (
            <NoData
              icon="search-outline"
              title="No mentors match"
              subtitle="Try clearing the skill filter or the search box."
              actionLabel="Clear filters"
              onAction={() => {
                setQuery('');
                setSkillFilter(null);
              }}
            />
          ) : null}
        </ScrollView>
      )}

      {/* Request composer */}
      <Modal visible={!!requesting} transparent animationType="slide" onRequestClose={() => setRequesting(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request a mentor</Text>
              <TouchableOpacity onPress={() => setRequesting(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {requesting ? (
              <View style={styles.targetBox}>
                <Text style={styles.targetName}>{requesting.name}</Text>
                <Text style={styles.targetMeta}>
                  {requesting.role ?? '—'}
                  {requesting.company ? ` · ${requesting.company}` : ''}
                </Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Area</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fieldChipRow}>
              {MENTORSHIP_FIELDS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, form.field === f && styles.chipActive]}
                  onPress={() => setForm((s) => ({ ...s, field: f }))}
                >
                  <Text style={[styles.chipText, form.field === f && styles.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Skills you want help with</Text>
            <TextInput
              style={styles.field}
              value={form.skills}
              onChangeText={(t) => setForm((s) => ({ ...s, skills: t }))}
              placeholder="e.g. System design, negotiation"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.fieldHint}>
              Comma separated. This is what matching uses to rank mentors for you.
            </Text>

            <Text style={styles.fieldLabel}>Why (optional)</Text>
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={form.message}
              onChangeText={(t) => setForm((s) => ({ ...s, message: t }))}
              multiline
              textAlignVertical="top"
              placeholder="A sentence helps a mentor say yes."
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRequesting(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitRequest} disabled={busy}>
                <Text style={styles.modalSubmitText}>{busy ? 'Sending…' : 'Send request'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/** Ranked candidates for the viewer's own pending request. */
function RankedMatches({ requestId, onRequest }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    alumniApi
      .requestMatches(requestId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [requestId]);

  if (error) return <Text style={styles.errorText}>{error}</Text>;
  if (!data) return <ActivityFallback />;

  return (
    <>
      <View style={styles.matchNote}>
        <Ionicons name="sparkles" size={13} color="#7c3aed" />
        <Text style={styles.matchNoteText}>
          {data.matchedOnSkills
            ? `Ranked on the skills you asked for, plus career fit. ${data.candidates.length} good match(es).`
            : 'No skills were stated, so these are ranked on career fit alone.'}
        </Text>
      </View>

      {data.candidates.map((c) => (
        <MentorCard key={c.userId} mentor={c} matched={c.score} onRequest={() => onRequest({ ...c, name: c.name })} />
      ))}

      {data.candidates.length === 0 ? (
        <NoData
          icon="sparkles-outline"
          title="No strong matches yet"
          subtitle="Nobody in the alumni pool has the skills you asked for at a senior enough level. Try asking for help with fewer, broader skills."
          color="#7c3aed"
        />
      ) : null}
    </>
  );
}

function ActivityFallback() {
  return (
    <View style={{ paddingVertical: 30, alignItems: 'center' }}>
      <Text style={styles.errorText}>Finding mentors…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#7c3aed', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10, alignSelf: 'center' },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  sub: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },

  rankBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 16, marginTop: 10, backgroundColor: '#f5f3ff', borderRadius: 12, padding: 11 },
  rankBannerText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#5b21b6' },
  matchNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f5f3ff', borderRadius: 10, padding: 10, marginBottom: 10 },
  matchNoteText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: '#5b21b6', lineHeight: 15 },

  chipWrap: { flexGrow: 0, marginTop: 10 },
  chipRow: { paddingHorizontal: 16, gap: 6 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },
  fieldChipRow: { flexWrap: 'wrap', gap: 6 },

  list: { padding: 16, paddingBottom: 28 },

  targetBox: { backgroundColor: '#f8fafc', borderRadius: 11, padding: 11, marginBottom: 4 },
  targetName: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  targetMeta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 12 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  fieldMultiline: { minHeight: 76 },
  fieldHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalSubmit: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
});
