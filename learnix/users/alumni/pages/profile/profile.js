/**
 * AL-08 Profile — the hub (docs/users/12-alumni-relations.md §3.8).
 *
 * WHAT THIS REPLACES
 * ------------------
 * A 419-line single file that called `GET /alumni/profile` — which returns
 * `{ id, fullName, email, roles }` plus three institution-wide counts — and rendered a
 * card for it. It had no edit affordance, no skills, no career, no achievements, no
 * privacy controls and no security controls. Four of its account menu items were wired
 * to `Alert.alert(label, 'Coming in a later phase.')`.
 *
 * The backend already had `GET/PUT /alumni/me` returning skills, privacy, company and
 * academic history — and no screen called it. So the profile was ~60% built and 0%
 * wired, and the screen that existed was showing the thinnest of the four endpoints.
 *
 * WHY THERE ARE TWO READS
 * -----------------------
 * `getProfileSelf` (`/alumni/profile`) is unredacted; `getMyProfile` (`/alumni/me`)
 * applies the OWNER'S own privacy settings. They must not be merged: without the
 * unredacted read you cannot see the email you chose to hide, which makes "hide my
 * email" indistinguishable from "delete my email". The server documents the same split.
 *
 * SCOPE
 * -----
 * Career, achievements and privacy WRITE locally through their own endpoints, because
 * each has its own rules the profile patch does not carry — one-current-role,
 * verification stamps, and switches that must respect the `discoverable` clamp. Only
 * the simple column edits go through `updateProfile`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi, authApi } from '../../../../services/api';
import { SkeletonCard } from '../../../../components/ui';
import { initialsOf } from './profileMeta';
import PersonalSection from './components/PersonalSection';
import AcademicSection from './components/AcademicSection';
import WorkSection from './components/WorkSection';
import SkillsSection from './components/SkillsSection';
import CareerSection from './components/CareerSection';
import AchievementsSection from './components/AchievementsSection';
import LinksSection from './components/LinksSection';
import PrivacySection from './components/PrivacySection';
import SecuritySection from './components/SecuritySection';

export default function AlumniProfile({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // The links section ends with "hide them with the Professional links switch in
  // Privacy". Recording where privacy sits in the scroll, rather than hardcoding an
  // offset, keeps that link correct after the sections above it change height.
  const scrollRef = useRef(null);
  const privacyY = useRef(0);

  const load = useCallback(async (spinner = true) => {
    try {
      if (spinner) setLoading(true);
      setError(null);
      setProfile(await alumniApi.myProfile());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The employers the work section offers, read from the directory facets rather than a
   * new endpoint — the facets already carry every registered company with its sector.
   *
   * Loaded once on mount and handed to the section, so switching tabs does not re-fetch.
   */
  const loadCompanies = useCallback(async () => {
    try {
      const facets = await alumniApi.directoryFacets();
      const list = facets?.companies ?? [];
      return Array.isArray(list) ? list : [];
    } catch {
      // Non-fatal: the section renders an explanation instead of a picker, and the
      // career timeline still accepts a free-text employer.
      return [];
    }
  }, []);

  /**
   * A column-level profile patch.
   *
   * On success the server returns the whole reloaded profile, so the local copy is
   * replaced rather than patched field-by-field — otherwise the screen and the server
   * disagree the moment one of them normalises a value.
   */
  const save = useCallback(async (payload) => {
    setSaving(true);
    try {
      const next = await alumniApi.updateMyProfile(payload);
      setProfile(next);
      return next;
    } finally {
      setSaving(false);
    }
  }, []);

  /** Career / achievements write through their own endpoints, then reload. */
  const afterWrite = useCallback(async () => {
    setProfile(await alumniApi.myProfile());
  }, []);

  const onLogout = () => {
    authApi.logout().then(() => {
      navigation?.setInitialScreen?.('main');
    });
  };

  const verifiedCount = useMemo(
    () => (profile?.achievements ?? []).filter((a) => a.isVerified).length,
    [profile],
  );

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => load()} accessibilityRole="button" style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
        setRefreshing(true);
        load(false);
      }} />}
    >
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(profile?.user?.fullName)}</Text>
        </View>
        <Text style={styles.name}>{profile?.user?.fullName}</Text>
        <Text style={styles.role}>
          {profile?.currentRole || profile?.headline || 'Alumnus'}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {profile?.academic?.authoritativeYear ? `Class of ${profile.academic.authoritativeYear}` : 'Alumnus'}
            </Text>
          </View>
          {profile?.chapter ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{profile.chapter.city}</Text>
            </View>
          ) : null}
          {profile?.company ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{profile.company.name}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <PersonalSection profile={profile} saving={saving} onSave={save} />

      <AcademicSection academic={profile?.academic} saving={saving} onSave={save} />

      <WorkSection
        profile={profile}
        saving={saving}
        onSave={save}
        loadCompanies={fetchCompanies}
      />

      <SkillsSection skills={profile?.skills ?? []} saving={saving} onSave={(list) => save({ skills: list })} />

      <CareerSection
        career={profile?.career ?? []}
        saving={saving}
        onAdd={async (entry) => {
          await alumniApi.addCareerEntry(entry);
          await afterWrite();
        }}
        onUpdate={async (id, patch) => {
          await alumniApi.updateCareerEntry(id, patch);
          await afterWrite();
        }}
        onHighlight={async (id, isHighlight) => {
          await alumniApi.setCareerHighlight(id, isHighlight);
          await afterWrite();
        }}
        onRemove={async (id) => {
          await alumniApi.removeCareerEntry(id);
          await afterWrite();
        }}
      />

      <AchievementsSection
        achievements={profile?.achievements ?? []}
        verifiedCount={verifiedCount}
        onAdd={async (entry) => {
          await alumniApi.addAchievement(entry);
          await afterWrite();
        }}
        onRemove={async (id) => {
          await alumniApi.removeAchievement(id);
          await afterWrite();
        }}
      />

      <LinksSection
        links={profile?.links}
        saving={saving}
        onSave={(links) => save({ links })}
        // The footer says "hide them with the Professional links switch in Privacy". That
        // instruction has to be clickable or it is just advice the user cannot act on
        // without scrolling past four sections to find the switch.
        onGoToPrivacy={() => {
          const y = privacyY.current;
          scrollRef.current?.scrollTo?.({ y, animated: true });
        }}
      />

      <View
        onLayout={(e) => {
          privacyY.current = e.nativeEvent.layout.y;
        }}
      >
        <PrivacySection
          privacy={profile?.privacy}
          saving={saving}
          onSave={(privacy) => save({ privacy })}
        />
      </View>

      <SecuritySection authApi={authApi} />

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={onLogout}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons name="log-out-outline" size={16} color={"#dc2626"} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={styles.footerNote}>
        <Ionicons name="heart-outline" size={11} color={theme.colors.textLight} />
        <Text style={styles.footerText}>Your profile is visible per your privacy settings.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { padding: 16, gap: 12, backgroundColor: theme.colors.background },
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 22, gap: 3 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  name: { fontSize: 19, fontWeight: '800', color: '#fff' },
  role: { fontSize: 12.5, color: 'rgba(255,255,255,0.86)' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 9, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: { fontSize: 10.5, fontWeight: '700', color: '#fff' },
  errorText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignSelf: 'center',
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  logoutText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 18,
  },
  footerText: { fontSize: 10.5, color: theme.colors.textLight },
});

