// X-06 — MARKSHEET: one student, one exam (docs/users/05 §3.4).
//
// Two calls, in order: the block lists the students who HAVE rows for this
// exam (the picker — this screen never guesses a student id), then
// `GET /results/marksheets/:id?examId=` fetches the detail: every subject
// with its 40/60 split read back from the paper, totals, overall grade,
// this exam's SGPA and the running CGPA.
//
// The grades shown here are the SERVER's — derived through `gradeFor()` —
// so a marksheet printed from this screen and a row on the Grades screen can
// never disagree. A FAILED detail fetch shows the error panel rather than an
// empty marksheet, because a blank transcript that looks legitimate is the
// worst possible failure on this screen.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GREEN, RED, SLATE, gradeColor, plural } from '../../resultsMeta';
import {
  ResultScreen,
  ExamPicker,
  Card,
  Chip,
  StatGrid,
  useResult,
  useExamPicker,
} from '../../resultsUi';

export default function ResultsMarksheet() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const roster = useResult(() => examcellApi.resultBlock('MARKSHEET', examId), [examId]);

  const items = roster.data?.items ?? [];
  const [studentId, setStudentId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pick the first student when the roster lands or the exam changes —
  // the selection never carries across exams (it would name a student with
  // no rows here and render an empty transcript as if it were real).
  useEffect(() => {
    setStudentId(items[0] ? items[0].studentProfileId : null);
    setDetail(null);
    setDetailError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, items.length]);

  const loadDetail = useCallback(async () => {
    if (!studentId || !examId) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await examcellApi.resultMarksheet(studentId, examId));
    } catch (err) {
      setDetailError(err.message || 'Could not load this marksheet');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [studentId, examId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const totals = detail?.totals;
  const rows = detail?.rows ?? [];

  return (
    <ResultScreen
      title="Marksheet"
      subtitle="One student, one exam: rows, totals, grade, SGPA and running CGPA."
      loading={roster.loading}
      refreshing={roster.refreshing}
      error={roster.error}
      onRetry={roster.reload}
      onRefresh={roster.onRefresh}
      header={
        <>
          <ExamPicker exams={picker.exams} examId={examId} onChange={setExamId} loading={picker.loading} error={picker.error} />

          {/* ── The roster doubles as the picker ── */}
          {items.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.picker}>
              {items.map((stu) => {
                const active = stu.studentProfileId === studentId;
                return (
                  <TouchableOpacity
                    key={stu.studentProfileId}
                    style={[s.pill, active && s.pillActive]}
                    onPress={() => setStudentId(stu.studentProfileId)}
                  >
                    <Text style={[s.pillName, active && s.pillNameActive]} numberOfLines={1}>{stu.student}</Text>
                    <Text style={[s.pillRoll, active && s.pillRollActive]}>{stu.rollNo}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      }
    >
      {!items.length && (
        <View style={s.empty}>
          <Ionicons name="document-text-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>No results to print</Text>
          <Text style={s.emptyBody}>Consolidate a slot first — a marksheet is built from result rows.</Text>
        </View>
      )}

      {items.length > 0 && detailLoading && (
        <View style={s.empty}>
          <Text style={s.emptyBody}>Loading marksheet…</Text>
        </View>
      )}

      {detailError && (
        <View style={s.error}>
          <Ionicons name="alert-circle" size={15} color={RED} />
          <Text style={s.errorText}>{detailError}</Text>
        </View>
      )}

      {detail && !detailLoading && (
        <>
          {/* ── The totals band ── */}
          <Card style={s.headCard}>
            <View style={s.headTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.headName}>{detail.student.name}</Text>
                <Text style={s.headMeta}>
                  {detail.student.rollNo} · {detail.exam.name}
                </Text>
              </View>
              <View style={[s.gradeBadge, { backgroundColor: `${gradeColor(totals.grade || 'F')}1A` }]}>
                <Text style={[s.gradeText, { color: gradeColor(totals.grade || 'F') }]}>{totals.grade || '—'}</Text>
              </View>
            </View>
            <View style={s.totalsGrid}>
              <View style={s.totalCell}>
                <Text style={s.totalValue}>{totals.marksObtained}/{totals.maxMarks}</Text>
                <Text style={s.totalLabel}>Total · {totals.percent}%</Text>
              </View>
              <View style={s.totalCell}>
                <Text style={[s.totalValue, { color: totals.sgpa === null ? SLATE : '#2563eb' }]}>
                  {totals.sgpa === null ? '—' : totals.sgpa}
                </Text>
                <Text style={s.totalLabel}>SGPA</Text>
              </View>
              <View style={s.totalCell}>
                <Text style={[s.totalValue, { color: totals.cgpa === null ? SLATE : '#0891b2' }]}>
                  {totals.cgpa === null ? '—' : totals.cgpa}
                </Text>
                <Text style={s.totalLabel}>CGPA</Text>
              </View>
              <View style={s.totalCell}>
                <Text style={[s.totalValue, { color: totals.failed > 0 ? RED : GREEN }]}>
                  {totals.passed}/{totals.subjects}
                </Text>
                <Text style={s.totalLabel}>Cleared</Text>
              </View>
            </View>
            <View style={s.headTags}>
              <Chip label={`${totals.credits} credits`} color="#0891b2" />
              <Chip
                label={totals.failed > 0 ? plural(totals.failed, 'backlog') : 'no backlog'}
                color={totals.failed > 0 ? RED : GREEN}
              />
              <Chip label={`${totals.lifetimeResults} results on record`} color={SLATE} />
            </View>
          </Card>

          {/* ── Per-subject rows, with the split read back from the paper ── */}
          {rows.map((r) => (
            <Card key={r.resultId} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.subName}>{r.subject}</Text>
                <Text style={s.subMeta}>
                  {r.code} · {r.credits} credits
                  {r.internalMarks !== null && r.externalMarks !== null
                    ? ` · ${r.internalMarks}+${r.externalMarks}`
                    : ''}
                </Text>
                <View style={s.tags}>
                  <Chip label={r.status} color={r.status === 'PUBLISHED' ? GREEN : SLATE} />
                  {r.revision > 0 && <Chip label={`rev ${r.revision}`} color={RED} />}
                  {r.reEvaluations.filter((q) => q.status !== 'REJECTED').length > 0 && (
                    <Chip label={`${r.reEvaluations.length} re-eval`} color="#2563eb" />
                  )}
                </View>
              </View>
              <View style={s.right}>
                <Text style={s.marks}>
                  {r.marksObtained}/{r.maxMarks}
                </Text>
                <View style={[s.gradeChip, { backgroundColor: `${gradeColor(r.grade)}1A` }]}>
                  <Text style={[s.gradeChipText, { color: gradeColor(r.grade) }]}>
                    {r.grade} · {r.gradePoint} pts
                  </Text>
                </View>
              </View>
            </Card>
          ))}

          {rows.length > 0 && (
            <Text style={s.foot}>
              {plural(rows.length, 'subject')} · grades derive from marks through the published scale — never typed
            </Text>
          )}
        </>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  picker: { marginBottom: 12 },
  pill: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, maxWidth: 170 },
  pillActive: { borderColor: '#2563eb', backgroundColor: '#2563eb0D' },
  pillName: { fontSize: 12, fontWeight: '600', color: '#334155', fontFamily: 'Manrope-SemiBold' },
  pillNameActive: { color: '#2563eb' },
  pillRoll: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  pillRollActive: { color: '#2563eb' },
  headCard: { padding: 14 },
  headTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headName: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  headMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 48, alignItems: 'center' },
  gradeText: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  totalsGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  totalCell: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#eef2f7', paddingVertical: 8, alignItems: 'center' },
  totalValue: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  totalLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },
  headTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  subMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  right: { alignItems: 'flex-end', gap: 4 },
  marks: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  gradeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  gradeChipText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${RED}0D`, borderWidth: 1, borderColor: `${RED}33`, borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 12, color: RED, fontFamily: 'Manrope-SemiBold' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
