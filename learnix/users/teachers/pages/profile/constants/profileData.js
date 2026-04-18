export const PROFILE = {
  name: 'Dr. Eleanor Vance',
  title: 'Senior Professor of Architectural History',
  email: 'e.vance@curator.edu',
  office: 'Hall 4, Office 302',
  verified: true,
};

export const STATS = [
  {
    id: 'students',
    value: '1,482',
    label: 'Students mentored across 12 countries',
    icon: 'groups',
    color: '#0050d4',
    bg: '#7b9cff4d',
    header: 'Lifetime Impact',
  },
  {
    id: 'success',
    value: '98.4',
    suffix: '%',
    label: 'Graduation success within target timeline',
    icon: 'school',
    color: '#702ae1',
    bg: '#dcc9ff4d',
    header: 'Success Rate',
  },
  {
    id: 'publications',
    value: '42',
    label: 'Peer-reviewed journals & monographs',
    icon: 'auto-stories',
    color: '#a23800',
    bg: '#ff956a4d',
    header: 'Publications',
  },
];

export const BIO = {
  title: 'Biography',
  paragraphs: [
    'Dr. Eleanor Vance is a distinguished historian specializing in the socio-political impact of neoclassical architecture in Western Europe. With over twenty years of experience in higher education, her work bridges the gap between urban planning and cultural heritage.',
    'Currently leading the "Metropolis & Memory" research initiative, Dr. Vance focuses on how modern digital curation can preserve architectural narratives for future generations. Her approach combines rigorous archival research with immersive spatial technology.',
  ],
};

export const ACADEMIC_HISTORY = [
  {
    id: 'phd',
    degree: 'PhD in Art History',
    school: 'Oxford University, 2004 — 2008',
    description: 'Thesis: "The Silent Columns: Neoclassicism as a Tool of Governance." Received the Dean\'s Award for Excellence.',
    active: true,
  },
  {
    id: 'masters',
    degree: 'Master of Urban Studies',
    school: 'Sorbonne University, 2001 — 2003',
    description: '',
    active: false,
  },
  {
    id: 'bachelors',
    degree: 'Bachelor of Liberal Arts',
    school: 'University of Chicago, 1997 — 2001',
    description: '',
    active: false,
  },
];

export const AWARDS = [
  {
    id: 'award1',
    title: 'Global Educator Grant',
    organization: 'UNESCO Foundation, 2022',
    icon: 'emoji-events',
    color: '#a23800',
  },
  {
    id: 'award2',
    title: 'Outstanding Research',
    organization: 'Academic Review, 2019',
    icon: 'military-tech',
    color: '#702ae1',
  },
];

export const SETTINGS = {
  notifications: [
    { id: 'assignments', label: 'Assignment Alerts', checked: true },
    { id: 'research', label: 'Research Digests', checked: true },
  ],
  privacy: [
    { id: 'portfolio', label: 'Public Portfolio View', checked: true },
    { id: 'contact', label: 'Show Contact Details', checked: false },
  ],
};

export const ACTIVITY = [
  {
    id: 'act1',
    title: 'New Publication Uploaded',
    time: '2 hours ago',
    color: '#0050d4',
  },
  {
    id: 'act2',
    title: 'Profile photo updated',
    time: 'Yesterday, 4:30 PM',
    color: '#d9dde0',
  },
];
