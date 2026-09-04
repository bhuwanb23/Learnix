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
    icon: 'article',
    description: 'Abstract: Neoclassicism & Digital Curation',
  },
  {
    id: 'act2',
    title: 'Profile photo updated',
    time: 'Yesterday, 4:30 PM',
    color: '#d9dde0',
    icon: 'person',
    description: 'Profile photo changed to the new campus portrait.',
  },
  {
    id: 'act3',
    title: 'Office hours updated',
    time: 'Yesterday, 10:15 AM',
    color: '#702ae1',
    icon: 'schedule',
    description: 'Updated availability for next week.',
  },
  {
    id: 'act4',
    title: 'Assignment graded batch',
    time: '3 days ago',
    color: '#0050d4',
    icon: 'assignment',
    description: 'Problem Set #04 — 12 submissions graded.',
  },
  {
    id: 'act5',
    title: 'Class notes published',
    time: '4 days ago',
    color: '#a23800',
    icon: 'menu-book',
    description: 'Unit 03 — Learning & Memory notes shared.',
  },
  {
    id: 'act6',
    title: 'Research grant submitted',
    time: '5 days ago',
    color: '#702ae1',
    icon: 'emoji-events',
    description: 'Metropolis & Memory Phase II proposal sent.',
  },
  {
    id: 'act7',
    title: 'Publication added',
    time: '1 week ago',
    color: '#16a34a',
    icon: 'article',
    description: 'The Silent Columns Revisited added to portfolio.',
  },
  {
    id: 'act8',
    title: 'Account settings changed',
    time: '1 week ago',
    color: '#8a8f94',
    icon: 'settings',
    description: 'Privacy preferences updated.',
  },
];

export const PUBLICATIONS = [
  {
    id: 'pub1',
    title: 'The Silent Columns: Neoclassicism as a Tool of Governance',
    journal: 'Oxford Review of Architecture',
    year: '2023',
    type: 'Journal Article',
    color: '#0050d4',
    abstract: 'Examines how neoclassical porticoes were used to stage civic authority across 19th century European capitals.',
  },
  {
    id: 'pub2',
    title: 'Digital Curation for Urban Heritage',
    journal: 'Journal of Cultural Informatics',
    year: '2022',
    type: 'Journal Article',
    color: '#702ae1',
    abstract: 'Proposes a framework for preserving architectural narratives using modern spatial technology.',
  },
  {
    id: 'pub3',
    title: 'Metropolis & Memory: A Spatial Reading of 19th Century Paris',
    journal: 'Curator Press',
    year: '2021',
    type: 'Monograph',
    color: '#a23800',
    abstract: 'A book-length study of how Haussmann-era boulevards reshaped collective memory in Paris.',
  },
  {
    id: 'pub4',
    title: 'Archival Practice in the Age of Immersive Technology',
    journal: 'Intl. Conference on Digital Heritage',
    year: '2020',
    type: 'Conference Paper',
    color: '#16a34a',
    abstract: 'Discusses VR workflows for reconstructing lost architectural sites from archival records.',
  },
  {
    id: 'pub5',
    title: 'Ornament and Authority in Neoclassical Facades',
    journal: 'Architectural History Quarterly',
    year: '2018',
    type: 'Journal Article',
    color: '#0050d4',
    abstract: 'Analyzes the rhetorical role of ornament in public buildings of the early Republic period.',
  },
  {
    id: 'pub6',
    title: 'The Public Square as Political Stage',
    journal: 'Urban Studies Review',
    year: '2016',
    type: 'Journal Article',
    color: '#702ae1',
    abstract: 'Traces how public squares in Rome and Vienna were engineered for mass spectacle.',
  },
];

export const OFFICE_HOURS = [
  { id: 'mon', day: 'Monday', slots: [
    { id: 'mon-1', time: '10:00 – 12:00', available: true },
    { id: 'mon-2', time: '14:00 – 16:00', available: false },
  ] },
  { id: 'tue', day: 'Tuesday', slots: [
    { id: 'tue-1', time: '09:00 – 11:00', available: true },
  ] },
  { id: 'wed', day: 'Wednesday', slots: [
    { id: 'wed-1', time: '10:00 – 12:00', available: false },
  ] },
  { id: 'thu', day: 'Thursday', slots: [
    { id: 'thu-1', time: '14:00 – 16:00', available: true },
  ] },
  { id: 'fri', day: 'Friday', slots: [
    { id: 'fri-1', time: '09:00 – 11:00', available: true },
  ] },
];

export const EDIT_FIELDS = [
  { key: 'name', label: 'Full Name', placeholder: 'Dr. Eleanor Vance', icon: 'person', required: true },
  { key: 'title', label: 'Designation', placeholder: 'Senior Professor of Architectural History', icon: 'work', required: true },
  { key: 'email', label: 'Email', placeholder: 'e.vance@curator.edu', icon: 'mail', keyboardType: 'email-address', required: true },
  { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', icon: 'phone', keyboardType: 'phone-pad' },
  { key: 'office', label: 'Office', placeholder: 'Hall 4, Office 302', icon: 'location-on' },
  { key: 'bio', label: 'Biography', placeholder: 'A short professional summary…', icon: 'notes', multiline: true },
];
