// X-06 — EXPORT: CSV of any exam's results (docs/users/05 §3.4).
//
// The preview below is the block read — the exact rows the export will carry,
// with the server's column list — so nobody downloads a file to find out what
// is in it. The download button calls `GET /results/export?examId&format`,
// which returns the built CSV (or JSON) as content plus a filename.
//
// A FAILED EXPORT IS SHOWN, not rendered as an empty file: an empty CSV that
// looks like an empty exam is how a registry upload gets zero rows and nobody
// notices. The server answers 422 when there is nothing to export.
//
// THE CONTENT IS SHARED THROUGH THE OS SHARE SHEET — this app runs where
// there is no browser download, so "export" means handing the CSV text to
// whatever handles files on this device.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GREEN, RED, SLATE, MUTED, gradeColor, plural } from '../../resultsMeta';
import {
  ResultScreen,
  ExamPicker,
  Card,
  Chip,
  StatGrid,
  ProblemStrip,
  useResult,
  useExamPicker,
  useAction,
} from '../../resultsUi';

export default function ResultsExport() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(
    () => examcellApi.resultBlock('EXPORT', examId),
    [examId],
  );
  const action = useAction();

  const rows = data?.rows ?? [];
  const columns = data?.columns ?? [];
  const preview = rows.slice(0, 8);

  const doExport = (format) =>
    action.run(async () => {
      const res = await examcellApi.resultExport(examId, format);
      await Share.share({ message: res.content, title: res.filename });
    });

  return (
    <ResultScreen
      title="Export results"
      subtitle="The exact rows the file will carry — preview first, download second."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <>
          <ExamPicker exams={picker.exams} examId={examId} onChange={setExamId} loading={picker.loading} error={picker.error} />
          <StatGrid
            items={[
              { id: 'rows', label: 'Rows', value: data?.count ?? 0, icon: 'rows-outline', color: '#2563eb' },
              { id: 'cols', label: 'Columns', value: columns.length, icon: 'grid-outline', color: '#0891b2' },
              { id: 'pass', label: 'Passing', value: rows.filter((r) => r.isPass).length, icon: 'checkmark-circle', color: GREEN },
              { id: 'fail', label: 'Failed', value: rows.filter((r) => !r.isPass).length, icon: 'close-circle', color: RED },
            ]}
          />
          <ProblemStrip problem={action.problem} />

          {data?.filename ? (
            <View style={s.fileRow}>
              <Ionicons name="document-outline" size={15} color={SLATE} />
              <Text style={s.fileName}>{data.filename}</Text>
            </View>
          ) : null}

          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, (action.busy || !rows.length) && s.btnOff]}
              disabled={action.busy || !rows.length}
              onPress={() => doExport('csv')}
              activeOpacity={0.75}
            >
              <Ionicons name="share-outline" size={14} color="#fff" />
              <Text style={s.btnText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnGhost, (action.busy || !rows.length) && s.btnOffGhost]}
              disabled={action.busy || !rows.length}
              onPress={() => doExport('json')}
              activeOpacity={0.75}
            >
              <Ionicons name="code-slash-outline" size={14} color="#334155" />
              <Text style={[s.btnText, { color: '#334155' }]}>JSON</Text>
            </TouchableOpacity>
          </View>
        </>
      }
    >
      {/* ── Column list — the file's header row ── */}
      <View style={s.cols}>
        {columns.map((c) => (
          <Chip key={c} label={c} color={MUTED} />
        ))}
      </View>

      {/* ── The preview: first 8 of exactly what ships ── */}
      {preview.map((r, i) => (
        <Card key={`${r.rollNo}-${i}`} style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{r.student}</Text>
            <Text style={s.meta}>
              {r.rollNo} · {r.courseCode} · {r.exam}
            </Text>
            <Text style={s.marks}>
              {r.marksObtained}/{r.maxMarks} · {r.percent}% · {r.status}
            </Text>
          </View>
          <View style={[s.gradeBadge, { backgroundColor: `${gradeColor(r.grade)}1A` }]}>
            <Text style={[s.gradeText, { color: gradeColor(r.grade) }]}>{r.grade}</Text>
          </View>
        </Card>
      ))}

      {!rows.length && (
        <View style={s.empty}>
          <Ionicons name="download-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>Nothing to export</Text>
          <Text style={s.emptyBody}>The server refuses an empty export — consolidate this exam first.</Text>
        </View>
      )}

      {rows.length > preview.length && (
        <Text style={s.foot}>
          showing {preview.length} of {plural(rows.length, 'row')} · the export carries every row, all {columns.length} columns
        </Text>
      )}
      {rows.length > 0 && rows.length <= preview.length && (
        <Text style={s.foot}>{plural(rows.length, 'row')} · every one of them ships</Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  fileName: { fontSize: 12, color: '#334155', fontFamily: 'Manrope-SemiBold' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  btnOff: { backgroundColor: '#94a3b8' },
  btnOffGhost: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  marks: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 42, alignItems: 'center' },
  gradeText: { fontSize: 14, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: MUTED, fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
