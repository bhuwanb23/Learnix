// Event data constants
export const EVENT_CATEGORIES = [
  { id: 'all', label: 'All Events', active: true },
  { id: 'academic', label: 'Academic', active: false },
  { id: 'cultural', label: 'Cultural', active: false },
  { id: 'sports', label: 'Sports', active: false },
  { id: 'career', label: 'Career', active: false },
  { id: 'workshops', label: 'Workshops', active: false },
];

export const DISCOVERY_EVENTS = [
  {
    id: '1',
    title: "Spring Fest: Harmony '24",
    description: "The biggest annual celebration of arts, music, and student talent. Outdoor stages, food trucks, and local bands.",
    category: 'Cultural',
    categoryColor: '#dcc9ff', // secondary-container
    categoryTextColor: '#5b00c7', // on-secondary-container
    date: { day: '12', month: 'APR' },
    time: '4:00 PM',
    location: 'Central Lawn',
    image: 'https://picsum.photos/seed/learnix-cover-1/800/480',
    attendees: 45, // 3 visible + 42
    avatars: [
      'https://picsum.photos/seed/learnix-1-a0/120/120',
      'https://picsum.photos/seed/learnix-1-a1/120/120',
      'https://picsum.photos/seed/learnix-1-a2/120/120',
    ]
  },
  {
    id: '2',
    title: 'UI Design Deep Dive',
    description: 'Master Figma and learn about visual systems in this hands-on 4-hour workshop for creative minds.',
    category: 'Workshop',
    categoryColor: '#7b9cff', // primary-container
    categoryTextColor: '#001e5a', // on-primary-container
    date: { day: '15', month: 'APR' },
    time: '10:30 AM',
    location: 'Media Lab 2',
    image: 'https://picsum.photos/seed/learnix-cover-2/800/480',
    attendees: 14,
    avatars: [
      'https://picsum.photos/seed/learnix-2-a0/120/120',
      'https://picsum.photos/seed/learnix-2-a1/120/120',
    ]
  },
  {
    id: '3',
    title: 'Varsity Finals: Lions vs. Hawks',
    description: 'The ultimate showdown. Come support the home team as they battle for the conference title.',
    category: 'Sports',
    categoryColor: '#ff956a', // tertiary-container
    categoryTextColor: '#5a1c00', // on-tertiary-container
    date: { day: '18', month: 'APR' },
    time: '7:00 PM',
    location: 'Main Arena',
    image: 'https://picsum.photos/seed/learnix-cover-3/800/480',
    attendees: 152,
    avatars: [
      'https://picsum.photos/seed/learnix-3-a0/120/120',
      'https://picsum.photos/seed/learnix-3-a1/120/120',
    ]
  },
];

/** Quick-search chips under the search bar (matches discovery events). */
export const EVENT_SEARCH_EXAMPLES = [
  { label: "Spring Fest", query: 'Spring' },
  { label: 'UI Design', query: 'UI' },
  { label: 'Varsity Finals', query: 'Varsity' },
];

/** Hero strip stats (separate from card-level attendee counts). */
export const HERO_STATS = {
  attendees: '1.2k+',
  speakers: 45,
  workshops: 12,
};

export const MY_REGISTRATIONS = [
  {
    id: 'r1',
    title: 'Startup Pitch Night',
    datetime: 'Tomorrow, 6:00 PM • Aud. A',
    borderColor: '#0050d4', // primary
    qrCode: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTpXEiu3qoX16bg7F0jcOLDmPEm7iadV_fUbWzitNr2M1jijWg-pSiJHrxrkqfy36ZPmJVPinXJ5O54hoUeIAEX9xdf3TiYNynhGBPqieUytcMWy6V4DV4crTmGXH3TNmDLzk85wilLYDCr0RmxYbxsu5INjhvlynL7Xb2mpOMj1PK2wz27Hmqg9eZjDiDcB4ARfFBrb85MffPCIB0VFk3MP0u7Zxnhe4LNKDyqulsmpEnNGLr7mfch8LShQ5CE7ULd2nc5CHNLJA',
    reminderActive: true,
    reminderText: 'Scan QR at the entrance',
    reminderColor: '#0050d4',
  },
  {
    id: 'r2',
    title: 'Jazz on the Green',
    datetime: 'Fri, Apr 19 • South Park',
    borderColor: '#702ae1', // secondary
    qrCode: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyORv2p7il4gvGf1x3cvVLUsEgMkp-XPnBmn154YSBeUSGC5veNY9X1u92iP_8TfLWkHmHA7vM5jKWlLwXeDEB54lUWwMIZqFjvTxh3y4k9oIg_udlIFejhEB31ouEVQnUev6MhXWiP85QV3mz9ZGRcb7GDqQ49-c8rKZne08SaKLFsWe45hd3AO-qgB3mzvIzo_Xovqg-PO_i_pZWRiWJLYMx4Ph9nuauIAsNczX1VA1-YkpVfAfOXWpCshEBHekmFaPk2MD_bT0',
    reminderActive: false,
    reminderText: 'Notified 2h before',
    reminderColor: '#94a3b8', // slate-400 equivalent
  }
];

export const EVENT_STATS = {
  upcoming: 12,
  xpEarned: 250,
};

export const TRENDING_TAGS = [
  '#Hackathon2024',
  '#EcoCampus',
  '#CareerFair',
  '#OpenMic',
  '#Workshop'
];
