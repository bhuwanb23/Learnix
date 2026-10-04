// F-04 Dues & Recovery — the recovery desk hub (docs/users/06 §3.3).
//
// The screen this replaces listed every due in one undifferentiated block, with
// two unlabelled icon buttons per row, and its headline "Unpaid" card counted
// BILLED amounts rather than what was still owed — so a part-paid bill read as
// fully outstanding. It also offered no way to find a specific family, no sense
// of how old the debt was, and no record of whether anyone had chased it.
//
// It is now four views over one desk, because the desk answers four different
// questions and none of them is served well by one flat list:
//   · BILLS    · what can I chase right now, bill by bill
//   · STUDENTS · which families owe the most, and how old is it
//   · COURSES  · which cohort is not paying, for the HOD conversation
//   · PLANS    · what we agreed to collect, and on what schedule
//
// Everything here comes from the server, and the server derives it:
//   · the headline is the sum of open BALANCES, not billed amounts
//   · each row's status is derived from what was actually paid against it
//   · a balance includes an assessed late fine, and the fine is shown beside it
//     rather than folded in silently
//   · the aging strip shows where the whole book sits, filter-independent
//   · a row that has been chased says so, so the next action can be a phone call
//     rather than another notification
//
// The headline and aging deliberately ignore the active filter — a summary that
// jumps around as you narrow a list is worse than useless. The filter's own
// totals are reported in the list header instead.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import {
  AnimatedCard, EmptyState, SearchBar, SkeletonStatRow, SkeletonCard,
} from '../../../../components/ui';
import {
  THEME, STATUS_FILTERS, SORTS, VIEWS, dueStatusMeta, overduePhrase, chaseLabel,
  rupees, compactRupees, fineLabel, SKIP_REASON_TONE,
} from './duesMeta';

export default function DuesModule({ navigation }) {
  const [view, setView] = useState('BILLS');
  const [data, setData] = useState(null);
  const [students, setStudents] = useState(null);
  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('OPEN');
  const [bucket, setBucket] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('SEVERITY');
  const [sortOpen, setSortOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');

  // Bulk reminder: an explicit tick-list, or "everyone matching this filter".
  // Either way nothing is sent until the preview has been read.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState({});
  const [bulk, setBulk] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNote, setBulkNote] = useState('');
  const [bulkGuards, setBulkGuards] = useState({ skipChased: true, minDaysOverdue: 0 });
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      // Each view loads only its own data. Fetching the whole book for a screen
      // nobody is looking at is the kind of waste that makes a list feel slow.
      if (view === 'BILLS') {
        setData(await accountsApi.dues({ status, bucket, q: search, sort, take: 50 }));
      } else if (view === 'STUDENTS') {
        setStudents(await accountsApi.duesStudents({ q: studentQuery, take: 50 }));
      } else if (view === 'COURSES') {
        setCourses(await accountsApi.duesCourses({}));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [view, status, bucket, search, sort, studentQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const switchView = (id) => {
    setView(id);
    setLoading(true);
    setError(null);
    setSelecting(false);
    setPicked({});
  };

  const stats = data?.stats || {};
  const aging = data?.aging || [];
  const dues = data?.dues || [];

  const filterActive = status !== 'OPEN' || bucket !== 'ALL' || search.trim().length > 0;
  const activeSort = useMemo(() => SORTS.find((s) => s.id === sort) ?? SORTS[0], [sort]);

  const clearFilters = () => { setStatus('OPEN'); setBucket('ALL'); setSearch(''); };
  const pickedIds = useMemo(() => Object.keys(picked).filter((id) => picked[id]), [picked]);
  const togglePick = (id) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  // "Everyone matching this filter" and "the rows I ticked" are the same request
  // shape server-side, so the preview behaves identically for both — the officer
  // always sees who is reached and who is skipped, with a reason per row.
  const selectionPayload = (allMatching) => ({
    ...(allMatching
      ? { filter: { status, bucket, ...(search.trim() ? { q: search.trim() } : {}) } }
      : { dueIds: pickedIds }),
    ...bulkGuards,
  });

  const openPreview = async (allMatching) => {
    setBusy(true);
    try {
      const preview = await accountsApi.previewRemindBulk(selectionPayload(allMatching));
      setBulk(preview);
      setBulkOpen(true);
    } catch (err) {
      Alert.alert('Cannot Preview', err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendBulk = (allMatching) => {
    Alert.alert(
      'Send these reminders?',
      `${bulk.targets.length} bill${bulk.targets.length === 1 ? '' : 's'} across ${bulk.students} ` +
        `student${bulk.students === 1 ? '' : 's'} will be notified — one message per family, ` +
        `itemising what they owe. ${bulk.skipped.length} will be skipped.\n\nThis cannot be unsent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await accountsApi.remindBulk({
                ...selectionPayload(allMatching),
                ...(bulkNote.trim() ? { note: bulkNote.trim() } : {}),
              });
              setBulkOpen(false);
              setBulk(null);
              setBulkNote('');
              setSelecting(false);
              setPicked({});
              await fetchData();
              Alert.alert(
                'Reminders sent',
                `${result.sent} message${result.sent === 1 ? '' : 's'} delivered to ` +
                  `${result.students} student${result.students === 1 ? '' : 's'}, covering ` +
                  `${result.bills} bill${result.bills === 1 ? '' : 's'}.`,
              );
            } catch (err) {
              Alert.alert('Could Not Send', err.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* - View switcher - */}
      <View style={styles.viewBar}>
        {VIEWS.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[styles.viewTab, view === v.id && styles.viewTabActive]}
            onPress={() => switchView(v.id)}
            activeOpacity={0.85}
          >
            <Ionicons name={v.icon} size={13} color={view === v.id ? '#fff' : '#64748b'} />
            <Text style={[styles.viewTabText, view === v.id && styles.viewTabTextActive]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {view === 'BILLS' && (<>
        {/* Headline — filter-independent on purpose. */}
        <AnimatedCard delay={0} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Outstanding</Text>
              <Text style={styles.heroValue}>{rupees(stats.outstandingRupees ?? 0)}</Text>
              <Text style={styles.heroSub}>
                {stats.openCount ?? 0} open bill{(stats.openCount ?? 0) === 1 ? '' : 's'} across{' '}
                {stats.defaulterCount ?? 0} student{(stats.defaulterCount ?? 0) === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="alert-circle-outline" size={22} color="#dc2626" />
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroRow}>
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>Overdue</Text>
              <Text style={[styles.heroCellValue, { color: '#dc2626' }]}>
                {compactRupees(stats.overdueRupees ?? 0)}
              </Text>
              <Text style={styles.heroCellMeta}>{stats.overdueCount ?? 0} bills</Text>
            </View>
            <View style={styles.heroCellDivider} />
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>Recovered 30d</Text>
              <Text style={[styles.heroCellValue, { color: '#059669' }]}>
                {compactRupees(stats.recoveredMonthRupees ?? 0)}
              </Text>
              <Text style={styles.heroCellMeta}>
                {stats.recoveredMonthCount ?? 0} allocation{(stats.recoveredMonthCount ?? 0) === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
          {/* A late fine is money the family did not agree to up front, so it
              gets its own cell instead of being buried in the headline. An
              officer watching outstanding jump must be able to say why. */}
          <View style={styles.heroDivider} />
          <View style={styles.heroRow}>
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>Late fines</Text>
              <Text style={[styles.heroCellValue, { color: '#d97706' }]}>
                {compactRupees(stats.lateFeeRupees ?? 0)}
              </Text>
              <Text style={styles.heroCellMeta}>{stats.lateFeeCount ?? 0} bills</Text>
            </View>
            <View style={styles.heroCellDivider} />
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>On a plan</Text>
              <Text style={[styles.heroCellValue, { color: '#7c3aed' }]}>
                {compactRupees(stats.installmentRupees ?? 0)}
              </Text>
              <Text style={styles.heroCellMeta}>{stats.installmentCount ?? 0} instalments</Text>
            </View>
          </View>

          {/* Part-paid and already-chased are the two states an officer is
              most likely to miss when scanning a long list. */}
          {(stats.partialCount > 0 || stats.chasedCount > 0) && (
            <View style={styles.heroFlags}>
              {stats.partialCount > 0 && (
                <View style={[styles.flag, { backgroundColor: '#fffbeb' }]}>
                  <Ionicons name="pie-chart" size={11} color="#d97706" />
                  <Text style={[styles.flagText, { color: '#d97706' }]}>
                    {stats.partialCount} part-paid
                  </Text>
                </View>
              )}
              {stats.chasedCount > 0 && (
                <View style={[styles.flag, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="megaphone" size={11} color={THEME} />
                  <Text style={[styles.flagText, { color: THEME }]}>
                    {stats.chasedCount} already chased
                  </Text>
                </View>
              )}
              {stats.installmentCount > 0 && (
                <View style={[styles.flag, { backgroundColor: '#f5f3ff' }]}>
                  <Ionicons name="git-branch" size={11} color="#7c3aed" />
                  <Text style={[styles.flagText, { color: '#7c3aed' }]}>
                    {stats.installmentCount} on a plan
                  </Text>
                </View>
              )}
              {stats.supersededCount > 0 && (
                <View style={[styles.flag, { backgroundColor: '#f1f5f9' }]}>
                  <Ionicons name="layers" size={11} color="#64748b" />
                  <Text style={[styles.flagText, { color: '#64748b' }]}>
                    {stats.supersededCount} split into plans
                  </Text>
                </View>
              )}
            </View>
          )}
        </AnimatedCard>

        {/* Waived money is off the books — say so rather than silently omitting it. */}
        {stats.waivedCount > 0 && (
          <AnimatedCard delay={50} style={[styles.block, styles.waivedBanner]}>
            <View style={styles.reverseRow}>
              <Ionicons name="gift" size={16} color="#7c3aed" />
              <Text style={styles.waivedText}>
                {stats.waivedCount} waived bill{stats.waivedCount === 1 ? '' : 's'} worth{' '}
                <Text style={styles.waivedAmount}>{rupees(stats.waivedRupees)}</Text> excluded from
                outstanding. Every waiver can be reinstated.
              </Text>
            </View>
          </AnimatedCard>
        )}

        <LateFeePolicyCard
          onPress={() => navigation.openModule('LateFeePolicy')}
          lateFeeRupees={stats.lateFeeRupees ?? 0}
          lateFeeCount={stats.lateFeeCount ?? 0}
        />

        {/* Aging — where the whole book sits, regardless of filters. */}
        <View style={styles.agingHeader}>
          <Text style={styles.sectionLabel}>Receivables aging</Text>
          <Text style={styles.sectionMeta}>all open dues</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agingRow}>
          {aging.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.agingCard, bucket === b.id && { borderColor: b.color, backgroundColor: b.color + '0f' }]}
              onPress={() => setBucket(bucket === b.id ? 'ALL' : b.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.agingDot, { backgroundColor: b.color }]} />
              <Text style={styles.agingLabel}>{b.label}</Text>
              <Text style={[styles.agingValue, { color: b.count ? b.color : '#94a3b8' }]}>
                {compactRupees(b.rupees)}
              </Text>
              <Text style={styles.agingCount}>{b.count} bill{b.count === 1 ? '' : 's'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchWrap}>
          <SearchBar placeholder="Search student, roll no or fee" onSearch={setSearch} />
        </View>

        {/* Status chips + sort */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, status === s.id && styles.chipActive]}
              onPress={() => setStatus(s.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={s.icon} size={12} color={status === s.id ? '#fff' : '#475569'} />
              <Text style={[styles.chipText, status === s.id && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setSortOpen((v) => !v)} activeOpacity={0.85}>
            <Ionicons name={activeSort.icon} size={14} color={THEME} />
            <Text style={styles.sortBtnText}>{activeSort.label}</Text>
            <Ionicons name={sortOpen ? 'chevron-up' : 'chevron-down'} size={12} color={THEME} />
          </TouchableOpacity>
          {filterActive && (
            <TouchableOpacity style={styles.resetBtn} onPress={clearFilters} activeOpacity={0.85}>
              <Ionicons name="refresh" size={13} color="#64748b" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.bulkToggle, selecting && styles.bulkToggleActive]}
            onPress={() => { setSelecting((v) => !v); setPicked({}); }}
            activeOpacity={0.85}
          >
            <Ionicons name="megaphone-outline" size={13} color={selecting ? '#fff' : THEME} />
            <Text style={[styles.bulkToggleText, selecting && styles.bulkToggleTextActive]}>
              {selecting ? 'Done' : 'Chase'}
            </Text>
          </TouchableOpacity>
        </View>

        {selecting && (
          <BulkBar
            count={pickedIds.length}
            onPreviewAll={() => openPreview(true)}
            onPreviewPicked={() => openPreview(false)}
            guards={bulkGuards}
            setGuards={setBulkGuards}
            busy={busy}
          />
        )}

        {sortOpen && (
          <View style={styles.sortPanel}>
            {SORTS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sortOption, sort === s.id && styles.sortOptionActive]}
                onPress={() => { setSort(s.id); setSortOpen(false); }}
                activeOpacity={0.8}
              >
                <Ionicons name={s.icon} size={14} color={sort === s.id ? THEME : '#94a3b8'} />
                <Text style={[styles.sortOptionText, sort === s.id && styles.sortOptionTextActive]}>
                  {s.label}
                </Text>
                {sort === s.id && <Ionicons name="checkmark" size={14} color={THEME} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* List header — the filter's own totals, so the hero is never mistaken
            for "what am I looking at right now". */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>
            {filterActive ? 'Matching dues' : 'Open dues'}
          </Text>
          <Text style={styles.listHeaderMeta}>
            {data?.filteredCount ?? dues.length} shown · {rupees(data?.filteredOpenRupees ?? 0)} outstanding
          </Text>
        </View>

        {dues.length === 0 ? (
          <>
            <EmptyState
              icon="checkmark-done-outline"
              title={filterActive ? 'Nothing matches' : 'Nothing outstanding'}
              subtitle={
                filterActive
                  ? 'Try a different name, roll number, or widen the filters.'
                  : 'Every bill raised for this institution has been settled.'
              }
            />
            {/* EmptyState's own action button is not pressable, so a real
                control has to be rendered out here. */}
            {filterActive && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.85}>
                <Ionicons name="refresh" size={15} color={THEME} />
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          dues.map((item, i) => (
            <DueRow
              key={item.id}
              item={item}
              index={i}
              selecting={selecting}
              picked={!!picked[item.id]}
              onToggle={() => togglePick(item.id)}
              onPress={() => navigation.openModule('DueDetail', { dueId: item.id })}
            />
          ))
        )}

        {(data?.total ?? 0) > dues.length && (
          <Text style={styles.moreNote}>
            Showing the first {dues.length} of {data.total}. Narrow the filter to see more.
          </Text>
        )}
        </>)}

        {view === 'STUDENTS' && (
          <StudentsView data={students} setQuery={setStudentQuery} navigation={navigation} />
        )}

        {view === 'COURSES' && <CoursesView data={courses} navigation={navigation} />}

        {view === 'PLANS' && <PlansView navigation={navigation} />}
      </ScrollView>

      {/* - Bulk reminder preview - */}
      {bulkOpen && bulk && (
        <KeyboardAvoidingView style={styles.sheetWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setBulkOpen(false)} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Who gets chased</Text>
            <Text style={styles.sheetHint}>
              One message per family, itemising every bill they owe. Nothing is sent until you
              confirm — and it cannot be unsent.
            </Text>

            <View style={styles.previewHero}>
              <View style={styles.previewCell}>
                <Text style={styles.previewValue}>{bulk.targets.length}</Text>
                <Text style={styles.previewLabel}>bills</Text>
              </View>
              <View style={styles.previewCell}>
                <Text style={styles.previewValue}>{bulk.students}</Text>
                <Text style={styles.previewLabel}>students</Text>
              </View>
              <View style={styles.previewCell}>
                <Text style={[styles.previewValue, { color: '#dc2626' }]}>{rupees(bulk.totalRupees)}</Text>
                <Text style={styles.previewLabel}>owed</Text>
              </View>
            </View>

            {bulk.skipped.length > 0 && (
              <View style={styles.skippedBox}>
                <Text style={styles.skippedTitle}>{bulk.skipped.length} skipped, and why</Text>
                <ScrollView style={styles.skippedList} nestedScrollEnabled>
                  {bulk.skipped.slice(0, 40).map((sk, i) => {
                    const benign = SKIP_REASON_TONE[sk.reason] === 'ok';
                    return (
                      <View key={`${sk.id}-${i}`} style={styles.skipRow}>
                        <Ionicons
                          name={benign ? 'checkmark-circle-outline' : 'remove-circle-outline'}
                          size={12}
                          color={benign ? '#059669' : '#d97706'}
                        />
                        <Text style={styles.skipName} numberOfLines={1}>{sk.student}</Text>
                        <Text style={styles.skipReason}>{sk.reason}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
                {bulk.skipped.length > 40 && (
                  <Text style={styles.skipMore}>and {bulk.skipped.length - 40} more.</Text>
                )}
              </View>
            )}

            <TextInput
              style={styles.sheetInput}
              placeholder="Note for every message (optional)"
              placeholderTextColor="#94a3b8"
              value={bulkNote}
              onChangeText={setBulkNote}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setBulkOpen(false)} activeOpacity={0.85}>
                <Text style={styles.sheetCancelText}>Not yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetConfirm, bulk.targets.length === 0 && styles.sheetConfirmDisabled]}
                onPress={() => sendBulk(pickedIds.length === 0)}
                activeOpacity={0.85}
                disabled={busy || bulk.targets.length === 0}
              >
                <Text style={styles.sheetConfirmText}>
                  {busy ? 'Sending…' : `Send ${bulk.students} reminder${bulk.students === 1 ? '' : 's'}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// - Late fee policy card -.
// Deliberately thin: the hub shows THAT a policy exists and WHAT it has already
// cost, and links to the screen where the rule is actually written. Policy is not
// something to be edited from inside a recovery list.
function LateFeePolicyCard({ onPress, lateFeeRupees, lateFeeCount }) {
  return (
    <AnimatedCard delay={70} onPress={onPress} style={[styles.block, styles.policyCard]}>
      <View style={styles.policyRow}>
        <View style={styles.policyIcon}>
          <Ionicons name="pricetag-outline" size={17} color="#d97706" />
        </View>
        <View style={styles.policyBody}>
          <Text style={styles.policyTitle}>Late fee policy</Text>
          <Text style={styles.policySub}>
            {lateFeeCount > 0
              ? `${rupees(lateFeeRupees)} charged across ${lateFeeCount} bill${lateFeeCount === 1 ? '' : 's'}`
              : 'No fine has been charged on any bill'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
      </View>
    </AnimatedCard>
  );
}

// - Bulk bar -.
function BulkBar({ count, onPreviewAll, onPreviewPicked, guards, setGuards, busy }) {
  return (
    <AnimatedCard delay={0} style={[styles.block, styles.bulkBar]}>
      <View style={styles.bulkTop}>
        <View style={styles.bulkBadge}>
          <Ionicons name="megaphone-outline" size={15} color={THEME} />
        </View>
        <View style={styles.bulkBody}>
          <Text style={styles.bulkTitle}>
            {count > 0 ? `${count} bill${count === 1 ? '' : 's'} ticked` : 'Tick bills to chase them'}
          </Text>
          <Text style={styles.bulkSub}>
            Every send is previewed first — you see who is reached and who is skipped.
          </Text>
        </View>
      </View>

      {/* Guards exist so a chase is never a mass nag. */}
      <View style={styles.guardRow}>
        <TouchableOpacity
          style={[styles.guardChip, guards.skipChased && styles.guardChipActive]}
          onPress={() => setGuards((g) => ({ ...g, skipChased: !g.skipChased }))}
          activeOpacity={0.85}
        >
          <Ionicons
            name={guards.skipChased ? 'checkbox' : 'square-outline'}
            size={13}
            color={guards.skipChased ? '#fff' : '#64748b'}
          />
          <Text style={[styles.guardText, guards.skipChased && styles.guardTextActive]}>
            Skip already chased
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.guardChip, guards.minDaysOverdue > 0 && styles.guardChipActive]}
          onPress={() => setGuards((g) => ({ ...g, minDaysOverdue: g.minDaysOverdue > 0 ? 0 : 7 }))}
          activeOpacity={0.85}
        >
          <Ionicons
            name={guards.minDaysOverdue > 0 ? 'checkbox' : 'square-outline'}
            size={13}
            color={guards.minDaysOverdue > 0 ? '#fff' : '#64748b'}
          />
          <Text style={[styles.guardText, guards.minDaysOverdue > 0 && styles.guardTextActive]}>
            {guards.minDaysOverdue > 0 ? `Only ${guards.minDaysOverdue}+ days late` : 'Any age'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bulkActions}>
        <TouchableOpacity
          style={[styles.bulkBtn, styles.bulkBtnGhost, (count === 0 || busy) && styles.bulkBtnOff]}
          onPress={onPreviewPicked}
          activeOpacity={0.85}
          disabled={count === 0 || busy}
        >
          <Text style={styles.bulkBtnGhostText}>Preview ticked</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bulkBtn, busy && styles.bulkBtnOff]}
          onPress={onPreviewAll}
          activeOpacity={0.85}
          disabled={busy}
        >
          <Ionicons name="people-outline" size={14} color="#fff" />
          <Text style={styles.bulkBtnText}>Preview all matching</Text>
        </TouchableOpacity>
      </View>
    </AnimatedCard>
  );
}

// - Students view -.
function StudentsView({ data, setQuery, navigation }) {
  const rows = data?.students || [];
  const s = data?.stats || {};

  return (
    <>
      <AnimatedCard delay={0} style={styles.heroCard}>
        <Text style={styles.heroLabel}>Students in debt</Text>
        <Text style={styles.heroValue}>{s.studentCount ?? rows.length}</Text>
        <Text style={styles.heroSub}>
          {rupees(s.outstandingRupees ?? 0)} outstanding · {rupees(s.overdueRupees ?? 0)} already late
        </Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Billed</Text>
            <Text style={[styles.heroCellValue, { color: '#0f172a' }]}>{compactRupees(s.billedRupees ?? 0)}</Text>
          </View>
          <View style={styles.heroCellDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Paid</Text>
            <Text style={[styles.heroCellValue, { color: '#059669' }]}>{compactRupees(s.paidRupees ?? 0)}</Text>
          </View>
          <View style={styles.heroCellDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Late fines</Text>
            <Text style={[styles.heroCellValue, { color: '#d97706' }]}>{compactRupees(s.lateFeeRupees ?? 0)}</Text>
          </View>
        </View>
      </AnimatedCard>

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search name, roll no or email" onSearch={setQuery} />
      </View>

      {rows.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Nobody owes anything"
          subtitle="Every student in this institution has cleared their fees."
        />
      ) : (
        rows.map((r, i) => (
          <AnimatedCard
            key={r.studentProfileId}
            delay={60 + i * 25}
            onPress={() => navigation.openModule('StudentDues', {
              studentProfileId: r.studentProfileId,
              rollNo: r.rollNo,
            })}
            style={styles.block}
          >
            <View style={styles.sRow}>
              <View style={styles.sAvatar}>
                <Text style={styles.sInitial}>{(r.name || '?').charAt(0)}</Text>
              </View>
              <View style={styles.sBody}>
                <View style={styles.sTitleLine}>
                  <Text style={styles.sName} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.sAmount}>{rupees(r.outstandingRupees)}</Text>
                </View>
                <Text style={styles.sMeta} numberOfLines={1}>
                  {r.rollNo}
                  {r.programName ? ` · ${r.programName}` : ''}
                  {r.semester ? ` · Sem ${r.semester}` : ''}
                </Text>
                <View style={styles.sChips}>
                  <View style={styles.sChip}>
                    <Text style={styles.sChipText}>{r.openDues} open</Text>
                  </View>
                  {r.overdueRupees > 0 && (
                    <View style={[styles.sChip, { backgroundColor: '#fef2f2' }]}>
                      <Text style={[styles.sChipText, { color: '#dc2626' }]}>{rupees(r.overdueRupees)} late</Text>
                    </View>
                  )}
                  {r.oldestOverdueDays > 0 && (
                    <Text style={styles.sOldest}>{overduePhrase(r.oldestOverdueDays)}</Text>
                  )}
                  {r.lateFeeRupees > 0 && (
                    <View style={[styles.sChip, { backgroundColor: '#fffbeb' }]}>
                      <Text style={[styles.sChipText, { color: '#d97706' }]}>
                        {rupees(r.lateFeeRupees)} fine
                      </Text>
                    </View>
                  )}
                  {r.installmentCount > 0 && (
                    <View style={[styles.sChip, { backgroundColor: '#f5f3ff' }]}>
                      <Ionicons name="git-branch-outline" size={9} color="#7c3aed" />
                      <Text style={[styles.sChipText, { color: '#7c3aed' }]}>
                        {r.installmentCount} on a plan
                      </Text>
                    </View>
                  )}
                  {r.churnedCount > 0 && <Text style={styles.sChased}>chased {r.churnedCount}×</Text>}
                </View>
              </View>
            </View>
          </AnimatedCard>
        ))
      )}
    </>
  );
}

// - Courses view -.
function CoursesView({ data, navigation }) {
  const groups = data?.groups || [];
  const s = data?.stats || {};

  return (
    <>
      <AnimatedCard delay={0} style={styles.heroCard}>
        <Text style={styles.heroLabel}>Recovery by cohort</Text>
        <View style={styles.heroTop}>
          <Text style={[styles.heroValue, { color: '#0f172a' }]}>{s.recoveryPercent ?? 0}%</Text>
          <View style={[styles.heroIcon, { backgroundColor: THEME + '10' }]}>
            <Ionicons name="school-outline" size={20} color={THEME} />
          </View>
        </View>
        <Text style={styles.heroSub}>
          of {rupees(s.billedRupees ?? 0)} billed across {groups.length} cohort
          {groups.length === 1 ? '' : 's'} has come back
        </Text>
      </AnimatedCard>

      {groups.length === 0 ? (
        <EmptyState
          icon="school-outline"
          title="Nothing billed yet"
          subtitle="No cohort has a fee raised against it yet."
        />
      ) : (
        groups.map((g, i) => (
          <AnimatedCard
            key={g.key}
            delay={60 + i * 25}
            onPress={() => navigation.openModule('CourseDues', { academicYearId: g.academicYearId })}
            style={styles.block}
          >
            <View style={styles.cTop}>
              <View style={styles.cBody}>
                <Text style={styles.cTitle} numberOfLines={1}>
                  {g.programName}{g.semester ? ` · Sem ${g.semester}` : ''}
                </Text>
                <Text style={styles.cMeta}>
                  {g.academicYearName} · {g.studentCount} student{g.studentCount === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.cRight}>
                <Text style={styles.cPct}>{g.recoveryPercent}%</Text>
                <Text style={styles.cPctLabel}>recovered</Text>
              </View>
            </View>
            <View style={styles.cBar}>
              <View style={[styles.cFill, { width: `${Math.min(100, g.recoveryPercent)}%` }]} />
            </View>
            <View style={styles.cStats}>
              <Text style={styles.cStatLabel}>Outstanding</Text>
              <Text style={styles.cStatValue}>{rupees(g.outstandingRupees)}</Text>
              <Text style={styles.cStatLabel}>Overdue</Text>
              <Text style={[styles.cStatValue, { color: '#dc2626' }]}>{rupees(g.overdueRupees)}</Text>
              <Text style={styles.cStatLabel}>Open</Text>
              <Text style={styles.cStatValue}>{g.openCount}</Text>
            </View>
          </AnimatedCard>
        ))
      )}
    </>
  );
}

// - Plans view -.
function PlansView({ navigation }) {
  const [plans, setPlans] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    accountsApi.duePlans({}).then(setPlans).catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.emptyRow}>
          <Ionicons name="cloud-offline-outline" size={16} color="#dc2626" />
          <Text style={styles.emptyText}>{err}</Text>
        </View>
      </AnimatedCard>
    );
  }
  if (!plans) {
    return (
      <>
        <SkeletonCard />
        <SkeletonCard />
      </>
    );
  }

  const rows = plans.plans || [];
  const stats = plans.stats || {};

  return (
    <>
      <AnimatedCard delay={0} style={styles.heroCard}>
        <Text style={styles.heroLabel}>Agreed payment plans</Text>
        <Text style={[styles.heroValue, { color: '#0f172a' }]}>{stats.activeCount ?? 0}</Text>
        <Text style={styles.heroSub}>
          running · {stats.completedCount ?? 0} finished · {stats.cancelledCount ?? 0} cancelled
        </Text>
      </AnimatedCard>

      {rows.length === 0 ? (
        <EmptyState
          icon="git-branch-outline"
          title="No plans agreed"
          subtitle="Open a bill with a balance and split it into instalments from its detail screen."
        />
      ) : (
        rows.map((p, i) => (
          <AnimatedCard
            key={p.id}
            delay={60 + i * 25}
            onPress={() => navigation.openModule('PaymentPlans', { planId: p.id })}
            style={styles.block}
          >
            <View style={styles.cTop}>
              <View style={styles.cBody}>
                <Text style={styles.cTitle}>{p.count} × {p.frequencyLabel.toLowerCase()}</Text>
                <Text style={styles.cMeta}>
                  {rupees(p.totalRupees)} agreed · started{' '}
                  {new Date(p.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <View style={styles.cRight}>
                <Text style={styles.cPct}>{p.progressPercent}%</Text>
                <Text style={styles.cPctLabel}>{p.settledCount}/{p.count} paid</Text>
              </View>
            </View>
            <View style={styles.cBar}>
              <View
                style={[
                  styles.cFill,
                  {
                    width: `${Math.min(100, p.progressPercent)}%`,
                    backgroundColor: p.complete ? '#059669' : THEME,
                  },
                ]}
              />
            </View>
            <View style={styles.cStats}>
              <Text style={styles.cStatLabel}>Left</Text>
              <Text style={styles.cStatValue}>{rupees(p.balanceRupees)}</Text>
              <Text style={styles.cStatLabel}>Overdue</Text>
              <Text style={[styles.cStatValue, { color: p.overdueCount > 0 ? '#d97706' : '#0f172a' }]}>
                {p.overdueCount > 0 ? `${p.overdueCount} late` : 'none'}
              </Text>
              <Text style={styles.cStatLabel}>Status</Text>
              <Text style={styles.cStatValue}>{p.status.toLowerCase()}</Text>
            </View>
          </AnimatedCard>
        ))
      )}

      <TouchableOpacity
        style={styles.clearBtn}
        activeOpacity={0.85}
        onPress={() => navigation.openModule('PaymentPlans', {})}
      >
        <Ionicons name="git-branch-outline" size={15} color={THEME} />
        <Text style={styles.clearBtnText}>Manage plans &amp; agree a new one</Text>
      </TouchableOpacity>
    </>
  );
}

function DueRow({ item, index, onPress, selecting, picked, onToggle }) {
  const meta = dueStatusMeta(item.status);
  const chase = chaseLabel(item);
  const fine = fineLabel(item);
  // A settled bill is not a problem, so it does not get the alarming red.
  const amountColor = item.collectible ? '#dc2626' : '#64748b';
  // Progress runs against everything CLAIMED, so a part-paid bill carrying a
  // fine cannot show a bar past its own end.
  const claimed = item.amountRupees + (item.lateFeeRupees ?? 0);
  const progress = claimed > 0 ? item.paidRupees / claimed : 0;

  return (
    <AnimatedCard
      delay={120 + index * 30}
      onPress={selecting ? onToggle : onPress}
      style={[styles.row, selecting && picked && styles.rowPicked]}
    >
      <View style={styles.rowTop}>
        {selecting && (
          <Ionicons
            name={picked ? 'checkbox' : 'square-outline'}
            size={20}
            color={picked ? THEME : '#cbd5e1'}
            style={styles.pickBox}
          />
        )}
        <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.student}</Text>
            <Text style={[styles.rowAmount, { color: amountColor }]}>{rupees(item.balanceRupees)}</Text>
          </View>

          <Text style={styles.rowSub} numberOfLines={1}>
            {item.rollNo}{item.semester ? ` · Sem ${item.semester}` : ''} · {item.title}
          </Text>

          {/* Part-paid bills get a progress bar — "₹1L of ₹2.25L" is the single
              most useful fact about a part-paid due, and the status pill alone
              does not convey it. */}
          {item.status === 'PARTIAL' && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {rupees(item.paidRupees)} of {rupees(item.amountRupees)} paid
              </Text>
            </View>
          )}

          <View style={styles.rowChips}>
            <View style={[styles.pill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.collectible && item.daysOverdue > 0 && (
              <Text style={[styles.overdueText, { color: meta.color }]}>{overduePhrase(item.daysOverdue)}</Text>
            )}
            {item.collectible && item.daysOverdue <= 0 && (
              <Text style={styles.notDueText}>
                due {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            )}
            {fine && (
              <View style={styles.fineTag}>
                <Ionicons name="alert-circle-outline" size={9} color="#d97706" />
                <Text style={styles.fineText}>{fine}</Text>
              </View>
            )}
            {item.isInstallment && (
              <View style={styles.instTag}>
                <Ionicons name="git-branch-outline" size={9} color="#7c3aed" />
                <Text style={styles.instText}>
                  {item.installmentSequence ? `Instalment ${item.installmentSequence}` : 'Instalment'}
                </Text>
              </View>
            )}
            {chase && (
              <View style={styles.chaseTag}>
                <Ionicons name="megaphone-outline" size={9} color={THEME} />
                <Text style={styles.chaseText}>{chase}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },
  emptyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 14 },
  emptyText: { flex: 1, fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 17 },

  // View switcher
  viewBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 4, backgroundColor: '#f5f7f9' },
  viewTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  viewTabActive: { backgroundColor: THEME, borderColor: THEME },
  viewTabText: { fontSize: 11, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  viewTabTextActive: { color: '#fff' },

  // Hero
  heroCard: { marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { fontSize: 28, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold', marginTop: 4, letterSpacing: -1 },
  heroSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  heroDivider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroCell: { flex: 1 },
  heroCellDivider: { width: 1, height: 34, backgroundColor: '#eef2f7' },
  heroCellLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  heroCellValue: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  heroCellMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  heroFlags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  policyCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  policyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center' },
  policyBody: { flex: 1 },
  policyTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  policySub: { fontSize: 10, color: '#92400e', fontFamily: 'Manrope-Regular', marginTop: 2 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  flagText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  // Waived banner
  waivedBanner: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  reverseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13 },
  waivedText: { flex: 1, fontSize: 11, color: '#5b21b6', fontFamily: 'Manrope-Medium', lineHeight: 17 },
  waivedAmount: { fontWeight: '800' },

  // Aging
  agingHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9, marginTop: 4 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sectionMeta: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  agingRow: { gap: 9, paddingRight: 8, paddingBottom: 4 },
  agingCard: { minWidth: 118, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 11 },
  agingDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 7 },
  agingLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  agingValue: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginTop: 3, letterSpacing: -0.4 },
  agingCount: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },

  // Search / filters
  searchWrap: { marginTop: 16, marginBottom: 12 },
  chipRow: { gap: 8, paddingRight: 8, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  bulkToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  bulkToggleActive: { backgroundColor: THEME, borderColor: THEME },
  bulkToggleText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
  bulkToggleTextActive: { color: '#fff' },

  bulkBar: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  bulkTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, paddingBottom: 8 },
  bulkBadge: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  bulkBody: { flex: 1 },
  bulkTitle: { fontSize: 13, fontWeight: '800', color: '#1e3a8a', fontFamily: 'Manrope-Bold' },
  bulkSub: { fontSize: 10, color: '#1d4ed8', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 14 },
  guardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 13, paddingBottom: 10 },
  guardChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbeafe' },
  guardChipActive: { backgroundColor: THEME, borderColor: THEME },
  guardText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  guardTextActive: { color: '#fff', fontWeight: '700' },
  bulkActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 13, paddingBottom: 13 },
  bulkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 11, backgroundColor: THEME },
  bulkBtnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: THEME + '44' },
  bulkBtnOff: { opacity: 0.45 },
  bulkBtnText: { fontSize: 12, fontWeight: '800', color: '#fff', fontFamily: 'Manrope-Bold' },
  bulkBtnGhostText: { fontSize: 12, fontWeight: '800', color: THEME, fontFamily: 'Manrope-Bold' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  sortBtnText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  resetText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  sortPanel: { backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 6, marginBottom: 14, marginTop: -6 },
  sortOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 9 },
  sortOptionActive: { backgroundColor: THEME + '0d' },
  sortOptionText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  sortOptionTextActive: { color: THEME, fontWeight: '700' },

  // List header
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  listHeaderMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium' },

  // Row
  row: { marginBottom: 9 },
  rowPicked: { borderColor: THEME, backgroundColor: '#f5f9ff' },
  pickBox: { marginRight: 8, marginTop: 9 },
  fineTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#fffbeb' },
  fineText: { fontSize: 10, color: '#d97706', fontFamily: 'Manrope-Medium' },
  instTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f5f3ff' },
  instText: { fontSize: 10, color: '#7c3aed', fontFamily: 'Manrope-Medium' },

  // Students rows
  sRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 13 },
  sAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: THEME + '12', justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  sInitial: { fontSize: 15, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  sBody: { flex: 1 },
  sTitleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  sName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  sAmount: { fontSize: 15, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold' },
  sMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  sChips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  sChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f1f5f9' },
  sChipText: { fontSize: 10, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  sOldest: { fontSize: 10, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  sChased: { fontSize: 10, color: THEME, fontFamily: 'Manrope-Medium' },

  // Course / plan rows
  cTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, paddingBottom: 8 },
  cBody: { flex: 1 },
  cTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  cMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  cRight: { alignItems: 'flex-end' },
  cPct: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  cPctLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  cBar: { height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden', marginHorizontal: 13 },
  cFill: { height: '100%', backgroundColor: THEME, borderRadius: 3 },
  cStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 13 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 13 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  rowBody: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  rowAmount: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  progressWrap: { marginTop: 7 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#d97706', borderRadius: 3 },
  progressText: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 3 },
  rowChips: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  overdueText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  notDueText: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium' },
  chaseTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: THEME + '10' },
  chaseText: { fontSize: 10, color: THEME, fontFamily: 'Manrope-Medium' },

  moreNote: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 12 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  // Bulk preview sheet
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28, maxHeight: '85%' },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sheetHint: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 16 },
  previewHero: { flexDirection: 'row', marginTop: 15, padding: 13, borderRadius: 13, backgroundColor: '#f8fafc' },
  previewCell: { flex: 1 },
  previewValue: { fontSize: 19, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  previewLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },
  skippedBox: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#fffbeb' },
  skippedTitle: { fontSize: 11, fontWeight: '800', color: '#92400e', fontFamily: 'Manrope-Bold' },
  skippedList: { marginTop: 8, maxHeight: 130 },
  skipRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  skipName: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },
  skipReason: { fontSize: 10, color: '#92400e', fontFamily: 'Manrope-Regular' },
  skipMore: { fontSize: 10, color: '#92400e', fontFamily: 'Manrope-Regular', marginTop: 6 },
  sheetInput: { marginTop: 14, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 12, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  sheetCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  sheetCancelText: { fontSize: 13, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
  sheetConfirm: { flex: 1.5, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME, alignItems: 'center' },
  sheetConfirmDisabled: { backgroundColor: '#cbd5e1' },
  sheetConfirmText: { fontSize: 13, fontWeight: '800', color: '#fff', fontFamily: 'Manrope-Bold' },
});