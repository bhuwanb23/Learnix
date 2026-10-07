/**
 * AL-01 Dashboard — the graduate overview (docs/users/12-alumni-relations.md §3.1).
 *
 * WHAT THIS REPLACES
 * ------------------
 * A 436-line screen that rendered an office engagement report: "ALUMNI RELATIONS OFFICE",
 * a progress bar reading "42% engagement · 56 alumni", donations RECEIVED BY THE SCHOOL,
 * and the count of mentorship requests awaiting the office's decision. Seven modules
 * consumed one `GET /alumni/dashboard` whose every figure was an `institutionId` aggregate.
 *
 * Nobody opens a dashboard to be told what their college achieved. They open it to see their
 * own batch, their job, their events, their mentorships and what they have given — so the
 * endpoint is now per-user (`dashboard.service.ts`) and the screen renders seven sections
 * that are all about the person reading it.
 *
 * ONE REQUEST, NOT SEVEN
 * ----------------------
 * Each card could have called its own endpoint, but that is a seven-request waterfall on the
 * screen people open first, with seven independent loading and error states to reconcile
 * into one page. The server assembles the whole summary so the dashboard is a single
 * round trip with a single spinner.
 *
 * THE EMPTY STATES ARE THE POINT, NOT AN AFTERTHOUGHT
 * ----------------------------------------------------
 * The app signs in as the Alumni Relations Office, whose own `AlumniProfile` has no batch,
 * no employer and no career entries. Two of the seven sections are therefore genuinely
 * sparse in the demo, and that is a true statement about the data rather than a rendering
 * failure. Every card distinguishes "you have not added this yet" from "this is zero",
 * because those are different claims and conflating them is how a profile screen teaches
 * people that its numbers are fiction.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { SkeletonCard } from '../../../../components/ui';
import { initialsOf } from '../profile/profileMeta';
import SnapshotCard from './components/SnapshotCard';
import CareerCard from './components/CareerCard';
import EventsCard from './components/EventsCard';
import MentorshipCard from './components/MentorshipCard';
import GivingCard from './components/GivingCard';
import NetworkCard from './components/NetworkCard';
import QuickActions from './components/QuickActions';

export default function AlumniDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      setData(await alumniApi.dashboard());
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
   * Tab and module switching are resolved once, here, so no card has to know the shape of
   * the navigation prop — which genuinely differs per screen in this app. The old
   * dashboard called `navigation.switchTab` from a card that only received
   * `openModule`, so "View all events" was a silent no-op.
   */
  const go = useMemo(
    () => ({
      tab: (name) => {
        if (typeof navigation?.switchTab === 'function') navigation.switchTab(name);
        else if (typeof navigation?.navigate === 'function') navigation.navigate(name);
      },
      module: (name) => {
        if (typeof navigation?.openModule === 'function') navigation.openModule(name);
        else if (typeof navigation?.navigate === 'function') navigation.navigate(name);
      },
    }),
    [navigation],
  );

  const handlers = useMemo(
    () => ({
      onEditProfile: () => go.tab('Profile'),
      onOpenProfile: () => go.tab('Profile'),
      onOpenEvents: () => go.tab('Events'),
      onOpenMentorship: () => go.module('Mentorship'),
      onOpenAlumni: () => go.tab('Alumni'),
      onGive: () => go.tab('Donations'),
      onOpenCampaign: () => go.tab('Donations'),
      onConnect: () => go.tab('Alumni'),
    }),
    [go],
  );

  if (loading && !data) {
    return (
      <View style={styles.skeletonWrap}>
        <View style={styles.skeletonHero} />
        <SkeletonCard style={styles.skeletonCard} />
        <SkeletonCard style={styles.skeletonCard} />
        <SkeletonCard style={styles.skeletonCard} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => load()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading the dashboard"
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unread = data?.unreadNotifications ?? 0;

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
      {/*
        The hero is the only place the person's own name appears at size. It deliberately
        does NOT carry the engagement percentage the old one showed: that number was
        computed over the whole institution and sat directly under the graduate's own name,
        which is how a school-wide ratio came to look like a personal achievement.
      */}
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>
            {initialsOf(data?.snapshot?.name)}
          </Text>
        </View>
        <Text style={styles.heroName} numberOfLines={1}>
          {data?.snapshot?.name ?? 'Welcome back'}
        </Text>
        <Text style={styles.heroSub} numberOfLines={1}>
          {data?.career?.role ?? data?.snapshot?.companyName ?? 'Alumnus'}
        </Text>
        <View style={styles.heroRow}>
          {data?.snapshot?.graduationYear ? (
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Class of {data.snapshot.graduationYear}</Text>
            </View>
          ) : null}
          {unread > 0 ? (
            <View style={styles.heroPill}>
              <Ionicons name="notifications-outline" size={11} color="#fff" />
              <Text style={styles.heroPillText}>{unread} unread</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <QuickActions navigation={navigation} />

        <Text style={styles.sectionHeading}>Your overview</Text>

        <SnapshotCard snapshot={data?.snapshot} onEditProfile={handlers.onEditProfile} />

        <CareerCard
          career={data?.career}
          onEditProfile={handlers.onEditProfile}
          onOpenMentorship={handlers.onOpenMentorship}
        />

        <EventsCard
          events={data?.events}
          onOpenEvents={handlers.onOpenEvents}
          onOpenEvent={handlers.onOpenEvents}
        />

        <MentorshipCard
          mentorship={data?.mentorship}
          onOpenMentorship={handlers.onOpenMentorship}
        />

        <GivingCard
          giving={data?.giving}
          onGive={handlers.onGive}
          onOpenCampaign={handlers.onOpenCampaign}
        />

        <NetworkCard
          network={data?.network}
          onOpenAlumni={handlers.onOpenAlumni}
          onConnect={handlers.onConnect}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    gap: 3,
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroAvatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  heroRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 9,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 10,
  },
  skeletonWrap: { flex: 1, backgroundColor: theme.colors.background, padding: 16, gap: 12 },
  skeletonHero: { height: 140, borderRadius: 20, backgroundColor: theme.colors.surfaceMuted },
  skeletonCard: {},
});