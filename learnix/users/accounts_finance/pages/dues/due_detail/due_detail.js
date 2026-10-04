// Due Detail — one fee, end to end (docs/users/06 §3.3).
//
// A due is a small record, but the questions an officer opens it to ask are not:
// how much is left, what has already been paid against it, have we chased this
// family and what did we say, who waived it if anyone, and what else does this
// student owe? This screen answers all of them from the server's derived
// numbers rather than the stored status column.
//
// The three mutations — remind, waive, reinstate — are gated honestly. Which one
// is even possible is decided by the server (`canRemind` / `canWaive` /
// `canReinstate`), so this screen renders an explanation instead of a button
// that would come back as a 409. Chasing a family for a bill they already paid
// is the worst thing this screen can do, so it refuses rather than guesses.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';
import {
  THEME, rupees, compactRupees, formatDate, formatDateTime, dueStatusMeta, overduePhrase,
  WAIVER_PRESETS, REMINDER_PRESETS, FINE_REASONS,
} from '../duesMeta';

export default function DueDetail({ navigation, route }) {
  const dueId = route?.params?.dueId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Which mutation sheet is open. Only one at a time — these are all
  // consequential and stacking two dialogs on a phone is how the wrong one gets
  // confirmed.
  const [sheet, setSheet] = useState(null); // 'remind' | 'waive' | 'reinstate' | 'assessFine' | 'waiveFine'
  const [note, setNote] = useState('');

  const fetchData = useCallback(async () => {
    if (!dueId) {
      setError('No fee due selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setData(await accountsApi.dueDetail(dueId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dueId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const closeSheet = () => { setSheet(null); setNote(''); };

  const confirm = () => {
    const text = note.trim();
    if (text.length < 3) {
      Alert.alert(
        'Reason Required',
        'Say why (at least 3 characters). This is stored on the record and shown to the student.',
      );
      return;
    }

    const copy = {
      remind: {
        title: 'Send Reminder?',
        body: `${data.student.name} will be notified that ${rupees(data.due.balanceRupees)} is ` +
          `${data.due.daysOverdue > 0 ? `${data.due.daysOverdue} day(s) overdue` : 'due'}.\n\n` +
          (text.length ? `Note: ${text}\n\n` : '') +
          'This is reminder number ' + ((data.due.reminderCount ?? 0) + 1) + '.',
        run: () => accountsApi.remindDue(dueId, text || undefined),
        done: 'Reminder sent',
        doneBody: 'The student has been notified and the reminder is on this bill\u2019s history.',
      },
      waive: {
        title: 'Waive This Fee?',
        body: `${rupees(data.due.balanceRupees)} will be written off and removed from outstanding.\n\n` +
          `Reason: ${text}\n\nThis is audited against your name, and can be reinstated later.`,
        run: () => accountsApi.waiveFee(dueId, text),
        done: 'Fee waived',
        doneBody: 'It is off the books and the student has been told why.',
      },
      assessFine: {
        title: 'Assess This Fine?',
        body: `${rupees(data.lateFee.wouldBeRupees)} will be added to this bill as a late-payment ` +
          `fine.\n\n${data.lateFee.ruleSummary}\n\nReason: ${text}\n\n` +
          'This is charged to the family, notified to them, and stamped with your name.',
        run: () => accountsApi.assessFine(dueId, text),
        done: 'Fine assessed',
        doneBody: 'It is now part of this bill\u2019s balance and the student has been told.',
      },
      waiveFine: {
        title: 'Remove This Fine?',
        body: `${rupees(data.lateFee.assessedRupees)} will be removed from this bill and the balance ` +
          `drops to ${rupees(Math.max(0, due.amountRupees - due.paidRupees))}.\n\n` +
          `Reason: ${text}\n\nThe bill is NOT waived — only the penalty goes. This is audited.`,
        run: () => accountsApi.waiveFine(dueId, text),
        done: 'Fine removed',
        doneBody: 'The penalty is off the bill. The fee itself is still owed.',
      },
      reinstate: {
        title: 'Reinstate This Fee?',
        body: `${rupees(data.due.balanceRupees)} becomes payable again and the bill returns to the ` +
          `recovery list.\n\nReason: ${text}`,
        run: () => accountsApi.reinstateDue(dueId, text),
        done: 'Fee reinstated',
        doneBody: 'It is back in the outstanding total and on the student\u2019s statement.',
      },
    }[sheet];

    if (!copy) return;

    Alert.alert(copy.title, copy.body, [
      { text: 'Cancel', style: 'cancel', onPress: closeSheet },
      {
        text: 'Confirm',
        style: sheet === 'waive' || sheet === 'assessFine' || sheet === 'waiveFine' ? 'destructive' : 'default',
        onPress: async () => {
          setBusy(true);
          try {
            await copy.run();
            closeSheet();
            await fetchData();
            Alert.alert(copy.done, copy.doneBody);
          } catch (err) {
            // The server is the authority on what is permitted; report its
            // refusal rather than silently doing nothing.
            Alert.alert('Cannot Do That', err.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { due, student, feeStructure, position, allocations, reminders, otherOpenDues, lateFee, plan } = data;
  const meta = dueStatusMeta(due.status);
  // Progress runs against everything claimed, so a part-paid bill carrying a
  // fine cannot show a bar past its own end.
  const claimed = due.amountRupees + (lateFee?.assessedRupees ?? 0);
  const progress = claimed > 0 ? due.paidRupees / claimed : 0;
  const presets =
    sheet === 'remind' ? REMINDER_PRESETS : sheet === 'waive' || sheet === 'reinstate' ? WAIVER_PRESETS : FINE_REASONS;
  const sheetTitle =
    sheet === 'remind' ? 'Send a reminder'
      : sheet === 'waive' ? 'Waive this fee'
        : sheet === 'reinstate' ? 'Reinstate this fee'
          : sheet === 'assessFine' ? 'Assess a late fine'
            : 'Remove the late fine';
  const sheetHint =
    sheet === 'remind'
      ? 'Optional note — it is appended to the message the student receives.'
      : 'Required. It is stored on the record and shown to the student.';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ── The bill ── */}
        <AnimatedCard delay={0} style={[styles.card, meta.border]}>
          <View style={styles.head}>
            <View style={[styles.headIcon, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={styles.headBody}>
              <Text style={styles.title}>{due.title}</Text>
              <Text style={styles.sub}>
                {student.program || 'Programme not set'}
                {student.semester ? ` · Sem ${student.semester}` : ''}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <View style={styles.amountBox}>
            {due.status === 'CLEARED' ? (
              <>
                <Text style={[styles.amountValue, styles.amountDone]}>{rupees(due.amountRupees)}</Text>
                <Text style={styles.settledNote}>settled in full</Text>
              </>
            ) : (
              <>
                <Text style={[styles.amountValue, { color: meta.color }]}>{rupees(due.balanceRupees)}</Text>
                <Text style={styles.balanceNote}>outstanding of {rupees(due.amountRupees)}</Text>
              </>
            )}
          </View>

          {/* Progress bar — only meaningful when something has been paid. */}
          {due.paidRupees > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.round(progress * 100))}%`, backgroundColor: meta.color },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {rupees(due.paidRupees)} paid{due.lastPaymentAt ? ` · last ${formatDate(due.lastPaymentAt)}` : ''}
              </Text>
            </View>
          )}

          <View style={styles.strip}>
            <StripRow label="Due date" value={formatDate(due.dueDate)} />
            <StripRow
              label="Status"
              value={due.daysOverdue > 0 ? overduePhrase(due.daysOverdue) : 'Not yet due'}
              valueColor={due.daysOverdue > 0 ? '#dc2626' : '#64748b'}
            />
            {feeStructure && (
              <StripRow label="Year" value={feeStructure.academicYear || '—'} />
            )}
            {feeStructure && (
              <StripRow
                label="Structure"
                value={`${rupees(feeStructure.tuitionRupees)} tuition + ${rupees(feeStructure.otherRupees)} other`}
              />
            )}
          </View>
        </AnimatedCard>

        {/* ── Waiver ── */}
        {due.status === 'WAIVED' && (
          <AnimatedCard delay={50} style={[styles.block, styles.waivedCard]}>
            <View style={styles.stampRow}>
              <Ionicons name="gift" size={17} color="#7c3aed" />
              <View style={styles.stampBody}>
                <Text style={styles.waivedTitle}>Waived {due.waivedAt ? formatDate(due.waivedAt) : ''}</Text>
                <Text style={styles.waivedReason}>{due.waivedReason}</Text>
                <Text style={styles.waivedBy}>by {due.waivedBy || 'an unknown officer'}</Text>
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* ── Late fine ── */}
        {lateFee && (
          <AnimatedCard delay={75} style={[styles.block, lateFee.assessedRupees > 0 ? styles.fineCard : styles.fineCardEmpty]}>
            <View style={styles.stampRow}>
              <Ionicons
                name={lateFee.assessedRupees > 0 ? 'alert-circle' : 'shield-checkmark-outline'}
                size={17}
                color={lateFee.assessedRupees > 0 ? '#d97706' : '#059669'}
              />
              <View style={styles.stampBody}>
                <Text style={[styles.fineTitle, { color: lateFee.assessedRupees > 0 ? '#92400e' : '#065f46' }]}>
                  {lateFee.assessedRupees > 0
                    ? `Late fine ${rupees(lateFee.assessedRupees)}`
                    : 'No late fine on this bill'}
                </Text>
                <Text style={styles.fineRule}>{lateFee.ruleSummary}</Text>

                {lateFee.assessedRupees > 0 ? (
                  <>
                    <Text style={styles.fineMeta}>
                      Assessed {formatDateTime(lateFee.assessedAt)}
                      {lateFee.stillAccruing
                        ? ` · still accruing, would now be ${rupees(lateFee.wouldBeRupees)}`
                        : ''}
                    </Text>
                    {due.canWaiveFine && (
                      <TouchableOpacity
                        style={styles.fineAction}
                        onPress={() => { setNote(''); setSheet('waiveFine'); }}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="close-circle-outline" size={13} color="#dc2626" />
                        <Text style={styles.fineActionText}>Remove this fine with a reason</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    {/* A ₹0 fine needs an explanation or it reads as a bug: the
                        bill may simply be inside its grace period. */}
                    <Text style={styles.fineMeta}>
                      {lateFee.ruleEnabled
                        ? lateFee.graceDaysRemaining > 0
                          ? `Nothing is owed yet — this bill is still inside the ${lateFee.graceDaysRemaining}-day grace period.`
                          : `No fine has been charged on this bill. It would now be ${rupees(lateFee.wouldBeRupees)}.`
                        : 'This institution does not charge a late fine.'}
                    </Text>
                    {due.canAssessFine && lateFee.canAssess && lateFee.ruleEnabled && (
                      <TouchableOpacity
                        style={styles.fineAction}
                        onPress={() => { setNote(''); setSheet('assessFine'); }}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="add-circle-outline" size={13} color="#d97706" />
                        <Text style={[styles.fineActionText, { color: '#d97706' }]}>
                          Assess {rupees(lateFee.wouldBeRupees)} now
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.fineLink}
                      onPress={() => navigation.openModule('LateFeePolicy')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="options-outline" size={12} color={THEME} />
                      <Text style={styles.fineLinkText}>Change the institution’s late fee policy</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* ── Payment plan ── */}
        {plan ? (
          <AnimatedCard delay={90} style={[styles.block, styles.planCard]}>
            <View style={styles.stampRow}>
              <Ionicons name="git-branch" size={17} color="#7c3aed" />
              <View style={styles.stampBody}>
                <Text style={styles.planTitle}>
                  {plan.count} × {plan.frequencyLabel.toLowerCase()} payment plan
                </Text>
                <Text style={styles.fineMeta}>
                  {rupees(plan.totalRupees)} agreed · started {formatDate(plan.startDate)} ·{' '}
                  {plan.settledCount}/{plan.count} settled · {plan.progressPercent}% paid
                </Text>
                {plan.overdueCount > 0 && (
                  <Text style={styles.planLate}>
                    {plan.overdueCount} instalment{plan.overdueCount === 1 ? ' is' : 's are'} past the
                    due date. The family agreed a plan, so chase gently — and do not waive the fee.
                  </Text>
                )}
                {plan.status === 'CANCELLED' && (
                  <Text style={styles.planLate}>
                    Cancelled {formatDateTime(plan.cancelledAt)} — the original bill is collectable again.
                  </Text>
                )}

                {(plan.installments || []).map((inst) => {
                  const m = dueStatusMeta(inst.status);
                  return (
                    <TouchableOpacity
                      key={inst.id}
                      style={styles.instRow}
                      activeOpacity={0.8}
                      onPress={() => navigation.openModule('DueDetail', { dueId: inst.id })}
                    >
                      <View style={[styles.instDot, { backgroundColor: m.color }]} />
                      <View style={styles.instBody}>
                        <Text style={styles.instTitle}>#{inst.sequence} · {formatDate(inst.dueDate)}</Text>
                        <Text style={styles.instMeta}>
                          {inst.status === 'CLEARED'
                            ? 'paid in full'
                            : inst.daysOverdue > 0
                              ? overduePhrase(inst.daysOverdue)
                              : 'not yet due'}
                        </Text>
                      </View>
                      <Text style={[styles.instAmount, { color: inst.status === 'CLEARED' ? '#059669' : '#dc2626' }]}>
                        {rupees(inst.balanceRupees)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.fineLink}
                  activeOpacity={0.85}
                  onPress={() => navigation.openModule('PaymentPlans', { planId: plan.id })}
                >
                  <Ionicons name="open-outline" size={12} color="#7c3aed" />
                  <Text style={[styles.fineLinkText, { color: '#7c3aed' }]}>
                    Open the plan, its schedule and cancellation
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedCard>
        ) : (
          due.canPlan && (
            <AnimatedCard delay={90} style={[styles.block, styles.planOffer]}>
              <View style={styles.stampRow}>
                <Ionicons name="git-branch-outline" size={17} color="#7c3aed" />
                <View style={styles.stampBody}>
                  <Text style={styles.planTitle}>Offer a payment plan</Text>
                  <Text style={styles.fineMeta}>
                    Split this {rupees(due.balanceRupees)} balance into 2–12 instalments the family
                    actually commits to. The bill is replaced by real instalments that are chased,
                    aged and fined on their own dates — a plan is tracked, not a note in a drawer.
                  </Text>
                  <TouchableOpacity
                    style={styles.planOfferBtn}
                    activeOpacity={0.85}
                    onPress={() => navigation.openModule('PaymentPlans', {
                      due: {
                        id: due.id,
                        title: due.title,
                        student: student.name,
                        balanceRupees: due.balanceRupees,
                      },
                    })}
                  >
                    <Ionicons name="git-branch-outline" size={14} color="#fff" />
                    <Text style={styles.planOfferBtnText}>Agree a payment plan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedCard>
          )
        )}

        {/* ── Who owes it ── */}
        <AnimatedCard delay={100} style={styles.block}>
          <View style={styles.personRow}>
            <View style={styles.personAvatar}>
              <Text style={styles.personInitial}>{(student.name || '?').charAt(0)}</Text>
            </View>
            <View style={styles.personBody}>
              <Text style={styles.personName}>{student.name}</Text>
              <Text style={styles.personMeta}>
                {student.rollNo}{student.email ? ` · ${student.email}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.positionBox}>
            <View style={styles.positionCell}>
              <Text style={styles.positionLabel}>This bill</Text>
              <Text style={[styles.positionValue, { color: meta.color }]}>{rupees(due.balanceRupees)}</Text>
            </View>
            <View style={styles.positionDivider} />
            <View style={styles.positionCell}>
              <Text style={styles.positionLabel}>All open dues</Text>
              <Text style={styles.positionValue}>{rupees(position.outstandingRupees)}</Text>
              <Text style={styles.positionMeta}>{position.openDues} open</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.openModule('StudentStatement', { studentProfileId: student.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={15} color={THEME} />
            <Text style={styles.linkText}>Open the full statement</Text>
            <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
          </TouchableOpacity>
        </AnimatedCard>

        {/* ── Actions ── */}
        <Text style={styles.label}>Actions</Text>
        <AnimatedCard delay={140} style={[styles.block, styles.actionsCard]}>
          {due.canCollect && (
            <ActionRow
              icon="cash-outline"
              color="#059669"
              title="Collect against this bill"
              subtitle="Opens the collections desk with this bill pre-selected"
              onPress={() => navigation.openModule('CollectPayment', {
                studentProfileId: student.id,
                dueId: due.id,
              })}
            />
          )}
          {due.canRemind && (
            <ActionRow
              icon="megaphone-outline"
              color={THEME}
              title="Send a reminder"
              subtitle={
                due.reminderCount > 0
                  ? `Chased ${due.reminderCount}× already · last ${formatDate(due.lastRemindedAt)}`
                  : 'Never chased this family'
              }
              onPress={() => { setNote(''); setSheet('remind'); }}
            />
          )}
          {due.canWaive && (
            <ActionRow
              icon="gift-outline"
              color="#7c3aed"
              title="Waive this fee"
              subtitle="Write it off with an audited reason. Reversible."
              onPress={() => { setNote(''); setSheet('waive'); }}
            />
          )}
          {due.canReinstate && (
            <ActionRow
              icon="arrow-undo-outline"
              color="#d97706"
              title="Reinstate this fee"
              subtitle="Undo the waiver and put the balance back on the books"
              onPress={() => { setNote(''); setSheet('reinstate'); }}
            />
          )}
          {/* Nothing is available — say why rather than showing an empty card. */}
          {!due.canCollect && !due.canRemind && !due.canWaive && !due.canReinstate && (
            <View style={styles.noActionRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color="#059669" />
              <Text style={styles.noActionText}>
                This bill is settled. There is nothing left to collect, chase or waive.
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* ── Payments against this bill ── */}
        <Text style={styles.label}>Payments against this bill</Text>
        {allocations.length === 0 ? (
          <AnimatedCard delay={170} style={styles.block}>
            <View style={styles.emptyRow}>
              <Ionicons name="cash-outline" size={16} color="#94a3b8" />
              <Text style={styles.emptyText}>
                Nothing has been paid against this bill yet.
              </Text>
            </View>
          </AnimatedCard>
        ) : (
          allocations.map((a, i) => (
            <AnimatedCard
              key={a.id}
              delay={170 + i * 25}
              onPress={() => navigation.openModule('CollectionDetail', { paymentId: a.paymentId })}
              style={styles.block}
            >
              <View style={styles.allocRow}>
                <View style={[styles.allocIcon, { backgroundColor: a.isReversed ? '#fef2f2' : '#f0fdf4' }]}>
                  <Ionicons
                    name={a.isReversed ? 'arrow-undo' : 'checkmark'}
                    size={15}
                    color={a.isReversed ? '#dc2626' : '#059669'}
                  />
                </View>
                <View style={styles.allocBody}>
                  <Text style={[styles.allocTitle, a.isReversed && styles.struck]} numberOfLines={1}>
                    {a.referenceNo}{a.receiptNo ? ` · ${a.receiptNo}` : ''}
                  </Text>
                  <Text style={styles.allocMeta}>
                    {formatDate(a.createdAt)}
                    {a.isReversed ? ' · reversed' : ''}
                  </Text>
                  {a.isReversed && a.reversalReason && (
                    <Text style={styles.allocReason}>{a.reversalReason}</Text>
                  )}
                </View>
                <Text style={[styles.allocAmount, a.isReversed && styles.struck]}>
                  {rupees(a.amountRupees)}
                </Text>
              </View>
            </AnimatedCard>
          ))
        )}

        {/* ── Other open dues ── */}
        {otherOpenDues.length > 0 && (
          <>
            <Text style={styles.label}>Also owed by this student</Text>
            {otherOpenDues.map((d, i) => (
              <AnimatedCard
                key={d.id}
                delay={200 + i * 20}
                onPress={() => navigation.openModule('DueDetail', { dueId: d.id })}
                style={styles.block}
              >
                <View style={styles.siblingRow}>
                  <View style={styles.siblingBody}>
                    <Text style={styles.siblingTitle} numberOfLines={1}>{d.title}</Text>
                    <Text style={styles.siblingMeta}>
                      {d.daysOverdue > 0 ? overduePhrase(d.daysOverdue) : 'not yet due'}
                    </Text>
                  </View>
                  <Text style={styles.siblingAmount}>{rupees(d.balanceRupees)}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                </View>
              </AnimatedCard>
            ))}
          </>
        )}

        {/* ── Reminder history ── */}
        <Text style={styles.label}>Recovery history</Text>
        <AnimatedCard delay={230} style={styles.block}>
          {reminders.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="megaphone-outline" size={16} color="#94a3b8" />
              <Text style={styles.emptyText}>
                No reminder has ever been sent for this bill.
              </Text>
            </View>
          ) : (
            reminders.map((r, i) => (
              <View key={r.id} style={[styles.historyRow, i > 0 && styles.historyBorder]}>
                <View style={styles.historyDot} />
                <View style={styles.historyBody}>
                  <Text style={styles.historyTitle}>Reminder sent by {r.actor}</Text>
                  <Text style={styles.historyTime}>{formatDateTime(r.sentAt)}</Text>
                  {r.note ? <Text style={styles.historyNote}>“{r.note}”</Text> : null}
                </View>
              </View>
            ))
          )}
          {due.waivedAt && (
            <View style={[styles.historyRow, reminders.length > 0 && styles.historyBorder]}>
              <View style={[styles.historyDot, { backgroundColor: '#7c3aed' }]} />
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle}>Waived by {due.waivedBy || 'an unknown officer'}</Text>
                <Text style={styles.historyTime}>{formatDateTime(due.waivedAt)}</Text>
                {due.waivedReason && <Text style={styles.historyNote}>“{due.waivedReason}”</Text>}
              </View>
            </View>
          )}
        </AnimatedCard>
      </ScrollView>

      {/* ── Action sheet ── */}
      {sheet && (
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.sheetBackdrop} onPress={closeSheet} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{sheetTitle}</Text>
            <Text style={styles.sheetHint}>{sheetHint}</Text>

            <View style={styles.presetWrap}>
              {presets.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.preset}
                  onPress={() => setNote(p)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.presetText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder={sheet === 'remind' ? 'Add a note (optional)' : 'Reason'}
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              editable={!busy}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetCancel} onPress={closeSheet} activeOpacity={0.85} disabled={busy}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetConfirm, sheet === 'waive' && styles.sheetConfirmDanger]}
                onPress={confirm}
                activeOpacity={0.85}
                disabled={busy}
              >
                <Text style={styles.sheetConfirmText}>
                  {busy
                    ? 'Working…'
                    : sheet === 'remind' ? 'Send'
                      : sheet === 'waive' ? 'Waive'
                        : sheet === 'reinstate' ? 'Reinstate'
                          : sheet === 'assessFine' ? 'Assess fine'
                            : 'Remove fine'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function StripRow({ label, value, valueColor }) {
  return (
    <View style={styles.stripRow}>
      <Text style={styles.stripLabel}>{label}</Text>
      <Text style={[styles.stripValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ActionRow({ icon, color, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.actionIcon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.actionBody}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
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
  card: { marginBottom: 10 },
  block: { marginBottom: 9 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 9 },

  // Head card
  head: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, paddingBottom: 4 },
  headIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  headBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sub: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  pillText: { fontSize: 10, fontWeight: '800', fontFamily: 'Manrope-Bold' },
  amountBox: { alignItems: 'center', paddingVertical: 12 },
  amountValue: { fontSize: 30, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1 },
  amountDone: { color: '#059669' },
  settledNote: { fontSize: 10, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  balanceNote: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  progressWrap: { paddingHorizontal: 14, paddingBottom: 10 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 4 },
  strip: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 11, gap: 7 },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stripLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', width: 76 },
  stripValue: { flex: 1, fontSize: 11, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  border: {},

  // Waiver stamp
  waivedCard: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  stampRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 14 },
  stampBody: { flex: 1 },
  waivedTitle: { fontSize: 12, fontWeight: '800', color: '#5b21b6', fontFamily: 'Manrope-Bold' },
  waivedReason: { fontSize: 12, color: '#5b21b6', fontFamily: 'Manrope-Medium', marginTop: 3, lineHeight: 17 },
  waivedBy: { fontSize: 10, color: '#7c3aed', fontFamily: 'Manrope-Regular', marginTop: 4 },

  // Late fine
  fineCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  fineCardEmpty: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  fineTitle: { fontSize: 12, fontWeight: '800', fontFamily: 'Manrope-Bold' },
  fineRule: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 3, lineHeight: 16 },
  fineMeta: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 5, lineHeight: 15 },
  fineAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca' },
  fineActionText: { fontSize: 11, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  fineLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  fineLinkText: { fontSize: 10, color: THEME, fontFamily: 'Manrope-Medium' },

  // Payment plan
  planCard: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  planOffer: { backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff' },
  planTitle: { fontSize: 12, fontWeight: '800', color: '#5b21b6', fontFamily: 'Manrope-Bold' },
  planLate: { fontSize: 10, color: '#92400e', fontFamily: 'Manrope-Medium', marginTop: 7, lineHeight: 15 },
  instRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#ede9fe', marginTop: 4 },
  instDot: { width: 7, height: 7, borderRadius: 4 },
  instBody: { flex: 1 },
  instTitle: { fontSize: 11, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  instMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  instAmount: { fontSize: 12, fontWeight: '800', fontFamily: 'Manrope-Bold' },
  planOfferBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 11, paddingVertical: 11, borderRadius: 11, backgroundColor: '#7c3aed' },
  planOfferBtnText: { fontSize: 12, fontWeight: '800', color: '#fff', fontFamily: 'Manrope-Bold' },

  // Person
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, paddingBottom: 8 },
  personAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center' },
  personInitial: { fontSize: 16, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  personBody: { flex: 1 },
  personName: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  personMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  positionBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  positionCell: { flex: 1 },
  positionDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9' },
  positionLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  positionValue: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginTop: 1 },
  positionMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 12 },
  linkText: { flex: 1, fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  // Actions
  actionsCard: { paddingVertical: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  actionIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  actionBody: { flex: 1 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  actionSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1, lineHeight: 14 },
  noActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 14 },
  noActionText: { flex: 1, fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', lineHeight: 17 },

  // Allocations
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  allocIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  allocBody: { flex: 1 },
  allocTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  struck: { color: '#94a3b8', textDecorationLine: 'line-through' },
  allocMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  allocReason: { fontSize: 10, color: '#dc2626', fontFamily: 'Manrope-Regular', marginTop: 2 },
  allocAmount: { fontSize: 13, fontWeight: '800', color: '#059669', fontFamily: 'Manrope-Bold' },

  // Siblings
  siblingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  siblingBody: { flex: 1 },
  siblingTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  siblingMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  siblingAmount: { fontSize: 13, fontWeight: '800', color: '#dc2626', fontFamily: 'Manrope-Bold' },

  // History
  historyRow: { flexDirection: 'row', gap: 11, padding: 13 },
  historyBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME, marginTop: 5 },
  historyBody: { flex: 1 },
  historyTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  historyTime: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  historyNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 16, fontStyle: 'italic' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14 },
  emptyText: { flex: 1, fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  // Sheet
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sheetHint: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 16 },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13, marginBottom: 12 },
  preset: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  presetText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },
  input: { minHeight: 76, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 12, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular', textAlignVertical: 'top' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sheetCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  sheetCancelText: { fontSize: 13, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
  sheetConfirm: { flex: 1.4, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME, alignItems: 'center' },
  sheetConfirmDanger: { backgroundColor: '#7c3aed' },
  sheetConfirmText: { fontSize: 13, fontWeight: '800', color: '#fff', fontFamily: 'Manrope-Bold' },
});