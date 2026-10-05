import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { EmptyState } from '../../../../../../components/ui';
import { PersonAvatar } from '../../components/EventCard';
import { fmtDate, stars } from '../../eventMeta';

/**
 * Feedback tab — reviews from people who checked in.
 *
 * The gate is enforced by the server (`canPostFeedback` mirrors a
 * `checkedInAt IS NOT NULL` check), and the UI reflects it rather than
 * re-deciding: someone who did not attend sees why they cannot review, instead
 * of a disabled button with no explanation.
 *
 * Loading is per-tab rather than on the hub, so opening Reviews does not block
 * on the rest of the event and the reviews stay fresh independently.
 */
export default function EventFeedback({ event, reload }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const vc = event.viewerContext ?? {};

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await alumniApi.eventFeedback(event.id));
    } catch (e) {
      Alert.alert('Cannot load reviews', e.message);
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Pre-fill from the viewer's own review so editing is editing, not retyping.
  useEffect(() => {
    const mine = data?.reviews?.find((r) => r.isMine);
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment ?? '');
    }
  }, [data]);

  const submit = async () => {
    if (rating === 0) {
      Alert.alert('Pick a rating', 'Tap a star to rate the event.');
      return;
    }
    try {
      setBusy(true);
      const res = await alumniApi.submitEventFeedback(event.id, {
        rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert(res.updated ? 'Review updated' : 'Thanks for the review', `Average is now ${res.average}.`);
      await load();
      reload();
    } catch (e) {
      Alert.alert('Cannot submit', e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete your review?', 'You can always write a new one afterwards.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await alumniApi.deleteEventFeedback(event.id);
            setRating(0);
            setComment('');
            await load();
            reload();
          } catch (e) {
            Alert.alert('Cannot delete', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const mine = data?.reviews?.find((r) => r.isMine);

  return (
    <View style={styles.section}>
      {loading && !data ? (
        <ActivityIndicator color="#2563eb" style={{ marginVertical: 30 }} />
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Overall</Text>
            {data?.count > 0 ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.bigRating}>{data.average}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.starRow}>
                      {stars(data.average, 16).map((s) => (
                        <Ionicons key={s.n} name={s.icon} size={16} color={s.filled ? '#f59e0b' : '#cbd5e1'} />
                      ))}
                    </View>
                    <Text style={styles.muted}>{data.count} attendee review(s)</Text>
                  </View>
                </View>
                {/* The distribution, so a 4.2 average with twenty 1-stars is
                    visible rather than hidden behind the number. */}
                {data.distribution
                  .filter((d) => d.count > 0)
                  .reverse()
                  .map((d) => (
                    <View key={d.star} style={styles.distRow}>
                      <Text style={styles.distStar}>{d.star}★</Text>
                      <View style={styles.distTrack}>
                        <View style={[styles.distBar, { width: `${Math.round((d.count / data.count) * 100)}%` }]} />
                      </View>
                      <Text style={styles.distCount}>{d.count}</Text>
                    </View>
                  ))}
              </>
            ) : (
              <Text style={styles.muted}>
                No reviews yet. Attendees can rate this event from the moment they are checked in.
              </Text>
            )}
          </View>

          {vc.canPostFeedback ? (
            <View style={styles.composeCard}>
              <Text style={styles.cardTitle}>{mine ? 'Your review' : 'Rate this event'}</Text>
              <View style={styles.starPick}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={4}>
                    <Ionicons
                      name={n <= rating ? 'star' : 'star-outline'}
                      size={28}
                      color={n <= rating ? '#f59e0b' : '#cbd5e1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Comments (optional)</Text>
              <TextInput
                style={[styles.field, styles.fieldMultiline]}
                value={comment}
                onChangeText={setComment}
                multiline
                textAlignVertical="top"
                placeholder="What was worth the trip? What should change next time?"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.formActions}>
                {mine ? (
                  <TouchableOpacity style={styles.deleteBtn} onPress={remove} disabled={busy}>
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy || rating === 0}>
                  <Text style={styles.submitText}>{busy ? 'Saving…' : mine ? 'Update' : 'Submit'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.gateNote}>
              <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.gateText}>
                {event.isPast
                  ? 'Reviews open once you have been checked in at an event.'
                  : 'Reviews open after the event, for people who attended.'}
              </Text>
            </View>
          )}

          {data?.reviews?.length > 0 ? (
            <>
              <Text style={styles.listTitle}>All reviews</Text>
              {data.reviews.map((r) => (
                <View key={r.id} style={styles.reviewRow}>
                  <PersonAvatar name={r.authorName} size={32} color="#7c3aed" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={styles.reviewHead}>
                      <Text style={styles.reviewName}>{r.authorName}</Text>
                      {r.isMine ? (
                        <View style={styles.youChip}>
                          <Text style={styles.youText}>you</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.starRowSmall}>
                      {stars(r.rating, 11).map((s) => (
                        <Ionicons key={s.n} name={s.icon} size={11} color={s.filled ? '#f59e0b' : '#cbd5e1'} />
                      ))}
                    </View>
                    {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
                    <Text style={styles.reviewDate}>{fmtDate(r.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}

          {data?.count === 0 ? (
            <EmptyState icon="star-outline" title="No reviews yet" subtitle="Be the first to rate this event after attending." color="#f59e0b" />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16, paddingBottom: 28 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  composeCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  bigRating: { fontSize: 38, fontFamily: 'Manrope-ExtraBold', color: '#f59e0b' },
  starRow: { flexDirection: 'row', gap: 2 },
  starRowSmall: { flexDirection: 'row', gap: 1, marginTop: 2 },
  muted: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },

  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  distStar: { width: 24, fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  distTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.colors.surfaceMuted, overflow: 'hidden' },
  distBar: { height: 5, borderRadius: 3, backgroundColor: '#f59e0b' },
  distCount: { width: 20, fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textAlign: 'right' },

  starPick: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 8 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  fieldMultiline: { minHeight: 80 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#fecaca', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11 },
  deleteText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#dc2626' },
  submitBtn: { flex: 1, backgroundColor: '#f59e0b', borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  submitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },

  gateNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 10 },
  gateText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 15 },

  listTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginBottom: 8, marginTop: 4 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewName: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  youChip: { backgroundColor: '#eef2ff', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  youText: { fontSize: 8, fontFamily: 'Manrope-Bold', color: '#4338ca' },
  reviewBody: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 16, marginTop: 4 },
  reviewDate: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4 },
});