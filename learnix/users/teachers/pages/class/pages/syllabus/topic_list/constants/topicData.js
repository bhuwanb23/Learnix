export const HEADER = {
  eyebrow: 'Curator / Editor',
  title: 'Edit Syllabus Unit',
};

export const UNIT_META = {
  code: 'PSY-402 • Advanced Neuroscience',
  title: 'Unit 02: Memory Consolidation & LTP',
  percent: 75,
  statusLabel: '75% Complete',
  progressLeft: '3 of 4 core topics delivered',
  progressRight: '6.0 / 8.0 hrs taught',
  chips: [
    { id: 'hours', icon: 'schedule', iconColor: '#0050d4', label: '8 Planned Hrs' },
    { id: 'quiz', icon: 'quiz', iconColor: '#702ae1', label: '1 Quiz Linked' },
    { id: 'decks', icon: 'co-present', iconColor: '#a23800', label: '3 Slide Decks' },
  ],
};

export const VISUAL = {
  eyebrow: 'CURRICULUM FLOW',
  text: 'Organize conceptual milestones before sync to the student syllabus.',
  image:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBpAlETijE3QuVFOhVmGoHgk1jp7WPiPSFQkIZ726RRb7TYZpV8A0PXccfMUd7su2B8TOcVqy6d6NUqD6fviqcdNNAB-cH9UGdzCMsY5M4GLcrt_kGuCeS3OXC7qldMuinXpN0ypgachtvuQ5J6dir6LtxwrhqoAV88PRyRzALmrcNDyx0ryPyT8HZBFvlzcKso1v2_MAEM6bdTnNe4txtEcfayShJv8HW7dEbgXH3LoisFfo_ZPA0s',
};

export const FILTERS = [
  { id: 'all', label: 'All (5)' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
];

export const TOPICS = [
  {
    id: 'topic-1',
    number: '01',
    status: 'done',
    statusBadge: { label: 'Completed • Oct 19', icon: 'check-circle', bg: 'rgba(0, 80, 212, 0.1)', color: '#0050d4' },
    hours: '2.5 hrs delivered',
    title: 'Long-Term Potentiation (LTP) Mechanics',
    description: 'NMDA receptors, CaMKII phosphorylation cascade, and post-synaptic dendritic spine remodeling.',
    chips: [
      { id: 'recordings', icon: 'videocam', iconColor: '#0050d4', label: '2 Recordings' },
      { id: 'quiz', icon: 'task-alt', iconColor: '#702ae1', label: '1 Practice Quiz' },
      { id: 'comprehension', icon: 'insights', label: '94% Class Comprehension', accent: true },
    ],
    hasEdit: true,
    hasNotes: true,
  },
  {
    id: 'topic-2',
    number: '02',
    status: 'done',
    statusBadge: { label: 'Completed • Oct 23', icon: 'check-circle', bg: 'rgba(0, 80, 212, 0.1)', color: '#0050d4' },
    hours: '2.0 hrs delivered',
    title: 'Hippocampal-Cortical Dialogue & Replay',
    description: 'Two-stage model of memory trace transfer, sharp-wave ripples (SWRs), and neocortical assimilation.',
    chips: [
      { id: 'slides', icon: 'picture-as-pdf', iconColor: '#0050d4', label: '1 Slides PDF' },
      { id: 'lab', icon: 'science', iconColor: '#702ae1', label: '1 Lab Demo' },
      { id: 'comprehension', icon: 'insights', label: '88% Class Comprehension', accent: true },
    ],
    hasEdit: true,
    hasNotes: true,
  },
  {
    id: 'topic-3',
    number: '03',
    status: 'active',
    inProgress: true,
    statusBadge: { label: 'In Progress (Active)', bg: '#ff956a', color: '#5a1c00', dot: true },
    hours: '1.5 of 2.0 hrs',
    title: 'Sleep Architecture & Memory Consolidation',
    nextLecture: {
      title: 'Next lecture: Tomorrow 10:00 AM • Hall B',
      sub: 'Key discussion flagged: Slow-wave sleep oscillations vs REM theta rhythms.',
    },
    hasOptions: true,
    actionButtons: [
      { id: 'edit-details', label: 'Edit Details', variant: 'secondary' },
      { id: 'log-delivery', label: 'Log Delivery', variant: 'primary' },
    ],
  },
  {
    id: 'topic-4',
    number: '04',
    status: 'active',
    scheduled: true,
    statusBadge: { label: 'Scheduled • Target Nov 02', icon: 'schedule', bg: '#dfe3e6', color: '#595c5e' },
    hours: '2.0 hrs',
    title: 'Reconsolidation & Synaptic Extinction Protocols',
    footerFlags: [
      { id: 'notes', icon: 'description', iconColor: '#0050d4', label: 'Draft notes uploaded' },
      { id: 'quiz', icon: 'warning', iconColor: '#a23800', label: 'Quiz pending creation', alert: true },
    ],
    hasOptions: true,
    actionButtons: [
      { id: 'edit', label: 'Edit', variant: 'secondary' },
      { id: 'schedule-class', label: 'Schedule Class', variant: 'tonal' },
    ],
  },
  {
    id: 'topic-5',
    number: '05',
    status: 'draft',
    statusBadge: { label: 'Draft / Optional', icon: 'visibility-off', bg: '#d9dde0', color: '#595c5e' },
    hours: '1.0 hr',
    title: 'Emerging Optogenetic Paradigms in Memory',
    description: 'Light-activated channelrhodopsin stimulation of engram cell ensembles in murine hippocampus.',
    hasOptions: true,
    actionButtons: [
      { id: 'delete', label: 'Delete', variant: 'danger' },
      { id: 'publish', label: 'Publish to Syllabus', variant: 'publish' },
    ],
  },
];

export const SUMMARY = {
  icon: 'view-list',
  title: '5 Topics in Unit',
  subtitle: 'Total: 9.5 Planned Hours',
};
