/**
 * Shared presentation helpers for the Profile screen.
 *
 * The enums mirror the server's — `profile.schemas.ts` owns the truth — and are
 * duplicated here rather than fetched, because they are UI vocabulary (a label, a
 * colour, an icon) and a screen that has to wait on a request before it can draw a
 * chip is worse than one that keeps a small copy. The check that they have not drifted
 * is in `backend/scripts/check-profile.ts`.
 */
import { theme } from '../../../../constants/theme';
import { alumniApi, authApi } from '../../../../services/api';

export const SECTIONS = [
  { key: 'identity', label: 'Personal', icon: 'person-outline' },
  { key: 'academic', label: 'Academic', icon: 'school-outline' },
  { key: 'work', label: 'Work', icon: 'briefcase-outline' },
  { key: 'skills', label: 'Skills', icon: 'construct-outline' },
  { key: 'career', label: 'Career', icon: 'trending-up-outline' },
  { key: 'achievements', label: 'Achievements', icon: 'trophy-outline' },
  { key: 'links', label: 'Links', icon: 'link-outline' },
  { key: 'privacy', label: 'Privacy', icon: 'eye-outline' },
  { key: 'security', label: 'Security', icon: 'lock-closed-outline' },
];

export const SKILL_LEVELS = [
  { id: 'EXPERT', label: 'Expert', color: '#7c3aed' },
  { id: 'ADVANCED', label: 'Advanced', color: '#0891b2' },
  { id: 'INTERMEDIATE', label: 'Intermediate', color: '#2563eb' },
  { id: 'BEGINNER', label: 'Beginner', color: '#64748b' },
];

export const skillLevelMeta = (id) =>
  SKILL_LEVELS.find((l) => l.id === id) ?? SKILL_LEVELS[2];

export const ACHIEVEMENT_KINDS = [
  { id: 'AWARD', label: 'Award', icon: 'ribbon-outline', color: '#b45309' },
  { id: 'CERTIFICATION', label: 'Certification', icon: 'certificate-outline', color: '#0369a1' },
  { id: 'PUBLICATION', label: 'Publication', icon: 'book-outline', color: '#5b21b6' },
  { id: 'TALK', label: 'Talk', icon: 'mic-outline', color: '#0f766e' },
  { id: 'VOLUNTEER', label: 'Volunteering', icon: 'heart-outline', color: '#be123c' },
];

export const achievementKindMeta = (id) =>
  ACHIEVEMENT_KINDS.find((k) => k.id === id) ?? ACHIEVEMENT_KINDS[0];

export const PRIVACY_SWITCHES = [
  { key: 'discoverable', label: 'Appear in directory search', hint: 'Off hides you from browse. Someone with your direct link still reaches you.' },
  { key: 'visibleTo', label: 'Who can contact you', hint: 'Applies to your email and phone. Your location, skills and links are unaffected.' },
  { key: 'showEmail', label: 'Email address', hint: 'Off by default. Being an alumnus is not consent to publish an address.' },
  { key: 'showPhone', label: 'Phone number', hint: 'Off by default.' },
  { key: 'showLocation', label: 'Location', hint: 'Your city or region, as written on your profile.' },
  { key: 'showCareer', label: 'Career history', hint: 'Your roles, employers and dates.' },
  { key: 'showSkills', label: 'Skills and achievements', hint: 'Achievements follow this switch — they are credentials.' },
  { key: 'showLinks', label: 'Professional links', hint: 'LinkedIn, GitHub and website. Not gated by "who can contact you".' },
];

export const VISIBLE_TO_OPTIONS = [
  { id: 'ANYONE', label: 'Anyone signed in' },
  { id: 'CONNECTIONS', label: 'My connections' },
  { id: 'OFFICE', label: 'The office only' },
];

/** `2025-03` → `Mar 2025`, without a timezone shifting the month. */
export function monthLabel(value) {
  if (!value) return 'Present';
  const m = /^(\d{4})-(\d{2})$/.exec(String(value));
  if (!m) return String(value);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initialsOf(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** The shareable `in:` path for a URL, used to label the link chip. */
export function linkMeta(key, url) {
  const map = {
    linkedinUrl: { label: 'LinkedIn', icon: 'logo-linkedin', color: '#0a66c2' },
    githubUrl: { label: 'GitHub', icon: 'logo-github', color: theme.colors.textPrimary },
    websiteUrl: { label: 'Website', icon: 'globe-outline', color: theme.colors.primary },
  };
  return { key, url, ...(map[key] ?? { label: 'Link', icon: 'link-outline', color: theme.colors.secondary }) };
}

/**
 * A `YYYY-MM` string for "now", or one `step` months back.
 *
 * Used to pre-fill the career form's start month. Computed in UTC because the value
 * goes straight into a `YYYY-MM` and a local-timezone month could be off by one at the
 * boundary.
 */
export function thisMonth(step = 0) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - step);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const api = { alumniApi, authApi };