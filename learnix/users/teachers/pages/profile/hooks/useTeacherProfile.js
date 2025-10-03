import { useMemo } from 'react';

export default function useTeacherProfile() {
  const profile = useMemo(() => ({
    name: 'Dr. Sarah Johnson',
    title: 'Mathematics Professor',
    university: 'Stanford University',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg',
    stats: [
      { id: 'pub', value: 127, label: 'Publications', color: '#2563EB' },
      { id: 'col', value: 89, label: 'Collaborations', color: '#16A34A' },
      { id: 'cert', value: 45, label: 'Certifications', color: '#9333EA' },
    ],
  }), []);

  const badges = useMemo(() => ([
    { id: 'b1', title: 'Excellence Award', subtitle: 'Research Innovation', icon: '🏆', bgStart: '#F59E0B' },
    { id: 'b2', title: 'Top Collaborator', subtitle: 'Q4 2024', icon: '🎖️', bgStart: '#A855F7' },
    { id: 'b3', title: 'Mentor of Year', subtitle: 'Student Choice', icon: '✅', bgStart: '#10B981' },
    { id: 'b4', title: 'Innovation Leader', subtitle: 'Tech Integration', icon: '⭐', bgStart: '#3B82F6' },
  ]), []);

  const quickAccess = useMemo(() => ([
    { id: 'qa1', title: 'Research & Collaboration', subtitle: 'Manage projects and partnerships', icon: '🔬', iconBg: '#DBEAFE', iconColor: '#2563EB', borderColor: '#DBEAFE' },
    { id: 'qa2', title: 'Event Tracking', subtitle: 'Conferences and workshops', icon: '📅', iconBg: '#DCFCE7', iconColor: '#16A34A', borderColor: '#DCFCE7' },
    { id: 'qa3', title: 'Micro-Certifications', subtitle: 'Earn and track credentials', icon: '🎓', iconBg: '#F3E8FF', iconColor: '#9333EA', borderColor: '#F3E8FF' },
    { id: 'qa4', title: 'Recognition Dashboard', subtitle: 'View achievements and metrics', icon: '📈', iconBg: '#FFEDD5', iconColor: '#EA580C', borderColor: '#FFEDD5' },
  ]), []);

  const discussions = useMemo(() => ([
    { id: 'd1', title: 'AI in Mathematics Education', meta: 'Dr. Michael Chen • 12 replies', avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg' },
    { id: 'd2', title: 'Research Collaboration Opportunities', meta: 'Prof. Lisa Wang • 8 replies', avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-7.jpg' },
  ]), []);

  const tiles = useMemo(() => ([
    { id: 't1', title: 'Study Groups', subtitle: 'Join peer learning', icon: '👥', color: '#2563EB' },
    { id: 't2', title: 'Ideas Hub', subtitle: 'Share innovations', icon: '💡', color: '#CA8A04' },
  ]), []);

  return { profile, badges, quickAccess, discussions, tiles };
}


