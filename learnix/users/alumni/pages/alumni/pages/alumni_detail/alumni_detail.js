import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';

/**
 * Alumni profile — skills, career journey, education, contributions, contact.
 *
 * Two rules drive the layout:
 *
 * 1. Contact details are rendered ONLY when the API returned them. The server
 *    applies each alumnus's privacy settings; the client must not attempt to
 *    "help" by showing an email it was not given. A redacted field is shown as
 *    an explicit "hidden by this alumnus" row rather than being omitted, so the
 *    user learns the information exists and is deliberately withheld — silence
 *    reads as "we don't have it", which is a different and wrong message.
 *
 * 2. The server already decided which actions are legal (connection state,
 *    whether this is you). This screen renders what it is given and never
 *    derives permission itself, so the two can't disagree.
 */

const LEVEL_COLOR = {
  EXPERT: '#7c3aed',
  ADVANCED: '#2563eb',
  INTERMEDIATE: '#059669',
  BEGINNER: '#64748b',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonth = (d) => {
  if (!d) return 'Present';
  const dt = new Date(d);
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function AlumniDetail({ alumniId, navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        setData(await alumniApi.alumniDetail(alumniId));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [alumniId],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const sendRequest = async (message) => {
    try {
      setBusy('connect');
      const res = await alumniApi.sendConnectionRequest(alumniId, message || undefined);
      Alert.alert(
        res.autoAccepted ? 'Already connected' : 'Request sent',
        res.autoAccepted
          ? `${res.with} had already asked you — you are now connected.`
          : `${res.with} will see your request in their connections inbox.`,
      );
      load(false);
    } catch (e) {
      Alert.alert('Cannot connect', e.message);
    } finally {
      setBusy(null);
    }
  };

  // Alert.prompt exists on iOS only. On Android we send the request without a
  // note rather than showing a dialog the user cannot answer — a note is
  // optional, and the request itself is the point.
  const onConnect = () => {
    if (typeof Alert.prompt === 'function') {
      Alert.prompt('Connect', `Send a connection request to ${data.name}?`, (message) => {
        if (message !== undefined) sendRequest(message);
      }, 'plain-text');
    } else {
      sendRequest();
    }
  };

  const onInvite = async () => {
    try {
      setBusy('invite');
      const res = await alumniApi.inviteAlumni(alumniId);
      Alert.alert('Invite sent', `${res.invited} has been notified about upcoming alumni events.`);
    } catch (e) {
      Alert.alert('Cannot invite', e.message);
    } finally {
      setBusy(null);
    }
  };

  const onAddMentor = async () => {
    try {
      setBusy('mentor');
      const res = await alumniApi.addMentor(alumniId);
      Alert.alert('Mentor added', `${res.mentor} → ${res.mentee} (${res.status}). Approve it from Mentorship to activate.`);
    } catch (e) {
      Alert.alert('Cannot add mentor', e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={navigation.goBack}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const c = data.contributions ?? {};
  const conn = data.connectionStatus;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
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
      {/* ── Hero ── */}
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          {data.isSelf && (
            <View style={styles.youPill}>
              <Text style={styles.youPillText}>Your profile</Text>
            </View>
          )}
        </View>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{initials(data.name)}</Text>
        </View>
        <Text style={styles.heroName}>{data.name}</Text>
        <Text style={styles.heroHeadline}>{data.headline ?? data.currentRole ?? 'Alumnus'}</Text>
        {data.program && (
          <Text style={styles.heroMeta}>
            {data.program.department.code} · {data.program.name}
            {data.graduationYear ? ` · Batch ${data.graduationYear}` : ''}
          </Text>
        )}
        <View style={styles.heroChips}>
          {data.company && (
            <View style={styles.heroChip}>
              <Ionicons name="business-outline" size={11} color="#fff" />
              <Text style={styles.heroChipText}>{data.company.name}</Text>
            </View>
          )}
          {data.location && (
            <View style={styles.heroChip}>
              <Ionicons name="location-outline" size={11} color="#fff" />
              <Text style={styles.heroChipText}>{data.location}</Text>
            </View>
          )}
          {data.chapter && (
            <View style={styles.heroChip}>
              <Ionicons name="map-outline" size={11} color="#fff" />
              <Text style={styles.heroChipText}>{data.chapter.city}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── Networking ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.mutualConnections ?? 0}</Text>
          <Text style={styles.statLabel}>Mutuals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.skillCount ?? data.skills?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Skills</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.career?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Roles</Text>
        </View>
      </View>

      {/* ── Contact (privacy-gated) ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.card}>
          <ContactRow
            icon="mail-outline"
            label="Email"
            value={data.email}
            onPress={data.email ? () => Linking.openURL(`mailto:${data.email}`) : undefined}
            hiddenReason={data.visibilityReason}
          />
          <View style={styles.divider} />
          <ContactRow
            icon="call-outline"
            label="Phone"
            value={data.phone}
            onPress={data.phone ? () => Linking.openURL(`tel:${data.phone}`) : undefined}
            hiddenReason={data.visibilityReason}
          />
          {!data.contactVisible && (
            <Text style={styles.privacyNote}>
              {data.visibilityReason === 'OFFICE'
                ? 'Contact details are visible to the Alumni Relations Office only.'
                : 'This alumnus has not published contact details. Accept their connection request to see them.'}
            </Text>
          )}
        </View>
      </View>

      {/* ── About ── */}
      {data.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.bio}>{data.bio}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Education ── */}
      {data.education && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          <View style={styles.card}>
            <Row icon="school-outline" label={data.education.program} />
            <Text style={styles.rowSub}>
              {data.education.department} · {data.education.batch}
            </Text>
            <Text style={styles.rowSub}>
              {data.education.startYear} – {data.education.graduationYear ?? 'present'}
            </Text>
          </View>
        </View>
      )}

      {/* ── Skills ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills & expertise</Text>
          {data.skills?.length > 0 && <Text style={styles.countBadge}>{data.skills.length}</Text>}
        </View>
        <View style={styles.card}>
          {data.skills?.length > 0 ? (
            <View style={styles.skillWrap}>
              {data.skills.map((s) => (
                <View
                  key={s.skill}
                  style={[styles.skillChip, { backgroundColor: (LEVEL_COLOR[s.level] ?? '#64748b') + '18' }]}
                >
                  <Text style={[styles.skillText, { color: LEVEL_COLOR[s.level] ?? '#64748b' }]}>{s.skill}</Text>
                  {s.yearsExperience ? (
                    <Text style={styles.skillYears}>{s.yearsExperience}y</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>No skills listed{!data.careerVisible ? ' or hidden by this alumnus' : ''}.</Text>
          )}
        </View>
      </View>

      {/* ── Career journey ── */}
      {data.careerVisible && data.career?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career journey</Text>
          <View style={styles.card}>
            {data.career.map((job, i) => (
              <View key={job.id} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, job.isCurrent && styles.timelineDotCurrent]} />
                  {i < data.career.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{job.title}</Text>
                  <Text style={styles.timelineMeta}>
                    {job.employer ?? '—'}
                    {job.location ? ` · ${job.location}` : ''}
                  </Text>
                  <Text style={styles.timelineDates}>
                    {fmtMonth(job.fromMonth)} — {fmtMonth(job.toMonth)}
                    {job.isCurrent ? '  · current' : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Contributions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contributions</Text>
        <View style={styles.card}>
          {c.donations?.length > 0 && (
            <Text style={styles.contribLine}>
              Donated ₹{(c.totalDonatedRupees ?? 0).toLocaleString('en-IN')} across {c.donations.length} gift
              {c.donations.length === 1 ? '' : 's'}
            </Text>
          )}
          {c.mentorship?.length > 0 && (
            <Text style={styles.contribLine}>
              Mentoring {c.mentorship.length} student{c.mentorship.length === 1 ? '' : 's'}
            </Text>
          )}
          {c.events?.length > 0 && (
            <Text style={styles.contribLine}>
              Attended {c.events.length} alumni event{c.events.length === 1 ? '' : 's'}
            </Text>
          )}
          {!c.donations?.length && !c.mentorship?.length && !c.events?.length && (
            <Text style={styles.muted}>No recorded contributions yet.</Text>
          )}
        </View>
      </View>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        {conn === 'ACCEPTED' ? (
          <View style={[styles.actionBtn, styles.actionConnected]}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.actionConnectedText}>Connected</Text>
          </View>
        ) : conn === 'PENDING' && data.connectionDirection === 'OUTGOING' ? (
          <View style={[styles.actionBtn, styles.actionPending]}>
            <Ionicons name="time-outline" size={16} color="#d97706" />
            <Text style={styles.actionPendingText}>Request pending</Text>
          </View>
        ) : conn === 'PENDING' && data.connectionDirection === 'INCOMING' ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={async () => {
              try {
                setBusy('accept');
                await alumniApi.respondToConnection(data.connectionId, 'accept');
                Alert.alert('Connected', `You are now connected with ${data.name}.`);
                load(false);
              } catch (e) {
                Alert.alert('Cannot accept', e.message);
              } finally {
                setBusy(null);
              }
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.actionPrimaryText}>
              {busy === 'accept' ? 'Accepting…' : 'Accept request'}
            </Text>
          </TouchableOpacity>
        ) : !data.isSelf ? (
          <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={onConnect} disabled={busy === 'connect'}>
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text style={styles.actionPrimaryText}>{busy === 'connect' ? 'Sending…' : 'Connect'}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionGhost]} onPress={onInvite} disabled={busy === 'invite'}>
            <Ionicons name="mail-outline" size={15} color="#2563eb" />
            <Text style={styles.actionGhostText}>{busy === 'invite' ? 'Sending…' : 'Invite to events'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGhost]}
            onPress={onAddMentor}
            disabled={busy === 'mentor'}
          >
            <Ionicons name="hand-left-outline" size={15} color="#0891b2" />
            <Text style={styles.actionGhostText}>{busy === 'mentor' ? 'Adding…' : 'Add as mentor'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function ContactRow({ icon, label, value, onPress, hiddenReason }) {
  return (
    <TouchableOpacity style={styles.contactRow} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={16} color={value ? theme.colors.textMuted : '#cbd5e1'} />
      <Text style={styles.contactLabel}>{label}</Text>
      {value ? (
        <Text style={styles.contactValue} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Text style={styles.contactHidden}>
          Hidden{hiddenReason === 'CONNECTIONS' ? ' — connect to view' : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function Row({ icon, label }) {
  return (
    <View style={styles.contactRow}>
      <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  backLink: { marginTop: 14, padding: 6 },
  backLinkText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.primary },

  hero: { padding: 18, paddingTop: 14, alignItems: 'center' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  youPill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  youPillText: { color: '#fff', fontSize: 10, fontFamily: 'Manrope-SemiBold' },
  heroAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  heroAvatarText: { color: '#fff', fontSize: 20, fontFamily: 'Manrope-ExtraBold' },
  heroName: { color: '#fff', fontSize: 19, fontFamily: 'Manrope-ExtraBold', marginTop: 10 },
  heroHeadline: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontFamily: 'Manrope-Medium', marginTop: 3, textAlign: 'center' },
  heroMeta: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontFamily: 'Manrope-Medium', marginTop: 4 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  heroChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 3 },
  heroChipText: { color: '#fff', fontSize: 10, fontFamily: 'Manrope-SemiBold' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 16, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  statLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },

  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginBottom: 10 },
  countBadge: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  bio: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 19 },

  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  contactLabel: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted, width: 52 },
  contactValue: { flex: 1, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  contactHidden: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium', color: '#cbd5e1' },
  privacyNote: { fontSize: 10, fontFamily: 'Manrope-Medium', color: '#94a3b8', marginTop: 8, lineHeight: 15 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 6 },

  rowLabel: { flex: 1, fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  rowSub: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginLeft: 26, marginTop: 2 },

  skillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  skillText: { fontSize: 11, fontFamily: 'Manrope-SemiBold' },
  skillYears: { fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },

  timelineRow: { flexDirection: 'row' },
  timelineRail: { width: 18, alignItems: 'center' },
  timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#cbd5e1', marginTop: 4 },
  timelineDotCurrent: { backgroundColor: '#2563eb', width: 11, height: 11, borderRadius: 6 },
  timelineLine: { flex: 1, width: 2, backgroundColor: theme.colors.border, marginVertical: 2 },
  timelineBody: { flex: 1, paddingBottom: 14, paddingLeft: 6 },
  timelineTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  timelineMeta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  timelineDates: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: '#2563eb', marginTop: 2 },

  contribLine: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginBottom: 4 },

  actions: { padding: 16, gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, gap: 6 },
  actionPrimary: { backgroundColor: '#2563eb' },
  actionPrimaryText: { color: '#fff', fontSize: 13, fontFamily: 'Manrope-Bold' },
  actionGhost: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  actionGhostText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  actionConnected: { backgroundColor: '#dcfce7' },
  actionConnectedText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#059669' },
  actionPending: { backgroundColor: '#fef3c7' },
  actionPendingText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#d97706' },
});