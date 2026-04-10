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
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBP6IqqI1hRQW5sW2Wbb05Mo73WN4dtUCgKmjJD3VX3ZobyeD1dgF21lXOLD5f3UP557hMdnqcsWMatkr2dsy3fFa60wvdFGtSGNfgrdP2991S6CsvHXotd5fZ-E7YiRT9_3I4vr8eW-UmF_RP3MJSXLsybwKKRKmRYYa9sdZiSkprZ2ZYKo7Stc_xbbtVJboCeN6MUqqthOKNbi__tt6NxugisueWxFxPOvNjXb_OkC3_luy-aGutZfj29VIFSN6CmPAaXvqN9Lk',
    attendees: 45, // 3 visible + 42
    avatars: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBwuHljW12s7TwQSMIfRQHlDj7kPwQVslDl50YQ81SbrgfyfKhrozqnJbz3c47x0RmChKCRGMqU9qkS0oRlJQjriO3C6dAYDwOoQfDdbg-MPfzGsrLM3_IlEK_YNgPHysP4V1SFqZWEdRV6ZInPiw9WYcJ_CEuV2P4zxUU-bwBLY-Ua2pFkIFYgmWT-hbJt9SCvrgnJQibkPN4sDM3pD6N6eGLop5LToB7hkbU4BAwciqt29J9do9TLKIi_o4KJnrt1cCwj9d2ZZjA',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAqwg86yfUN7_5kOoW8GqWIkWFP-uZxVeHo5jHNMjocmYs1C0HvoQb8o1ppMRO20-q7Cm2Nv_X2JNsl57oiwrrTub4cWPWvjhvgcKanjn7_hepPMB5DVnIVL32OdCyxhYG9zKcahqfT99JweFMnpBVBLZJQmr-UZHJa63Rut43BK2BgfaRa4ZgX7WvnmGTPrYGTIcIaqjv0vBpUW67ijvD8AwxKuGLV4081lb626eac4jILbBBCr63fq461K6yJRBheBjaLpYVT2pk',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCkVUqPNUQ9ClrSz6XOM9K--8nwYuXhaxD7JIieGTxZMEVl3n_neuiXOp2q9omMyzTsvrLaVb6PK5-79xFsDUjVknDN1qDTo_WGUPfLhehYjob5n8HMUc7Ors7JtTBkSbdcfHxK9bakdhE1uqOkrpc8JmTzbotM1NxCPaIR0zZepnmGXfcinZiqsdKWQCEAO0NOyCwxQdMNpR5QH9zRJCJeQhTjI3xLPUWNLaiJrXeAqwWoabE0UhF8D8_3v1kKCBj7PcBZwnP2lBc',
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
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-YG34wb9Th2FJcf_7rfDXKLIwqTQBIC6GpMPHDuHSF7ckvKVdc8kIKQ9HAFLg3WNu-I26Tx_RThGKHKuoqY1rsO4SazJnr8zMncwuft4sFbQyE0kCPF-B34hFj6H41sfgkea0vZG3Dw3QfZ1RSUXTOf8J-zpp72SerfNtJZe3NZjMZG17ksF0jhjmwt7GJ6d2YisG5VrmxBgUH5P1wzEmxVSBeVy0i-pXjRsA33_KmHs1D60r2VgTbmYOfeYZYgMbhJFiZxxgD_s',
    attendees: 14,
    avatars: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBwnKfhtRXpb7G1hYpwQhLj6M3eepaZfAius5sKZRDxS7RolxCMrMRbIRERI9wzGPqyEo0Y4GjTIbS6DFNL6avaAfOTyjq5UE8zi7c6V1Byq3_GaCnUwok3KTM87ocRT2XvIPKqpVHdqZFSQuy5TZlg7O1ULER47YqSaY_RlSj_D8LJcWtMcFhrkDRRf7lRYoo_R0eoJ-otywPb4xMqs2eI_uOlXTun5Ce-DRpCMzL87Bv4DcfK9eJnt0PX4Cw-bLxwE1sglGiRW_s',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ-uyewRCkTkPl9jjTKbb2HDlP2o7d3bWvICchCfLTsl-CkbEXY6Ozn--YgLf65e1juHLrrsM6XzFpw6fXtPn34YBvirdHzRz268qxDhV3mz8rqImVaC028TuJ3sSpPyobXMNb0DBfA7QdO9lvghVd9ur1slEBeMVxJeuFxeJRkC0N0wKkhRThQwdvFnIbistunUzHZwW-4Q_7rkYnggZsKlSUOK2hTTKLk5TxvNmgIuXuzXNi_Z9RZaCsBIZK21dbtmxLajlqEWY',
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
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDb_94hU1UX6UTc1sDbOCkKgF6p6mfXh4_mLkAEttvbO3ia_mSgsQwzYhTGpb_QmhH1O1CFV_gNp-KMLYyXIcE0bQurlr1uCHYmacZrVNKee3k8FZKXmsHy2zZTizN6pxDQiSKFaFXxn60T0cMxSzV6gfnxwHqb7Nh9R11SlurR_i9KDN8-Mx6KuAMXQfYmlF3e38l56Yc4BZ-inGtiGxyBJTYAGvkQbWB5odgScxOK5hi-Jnf9Mxtewc6hq18qPFeYJd_S6mms1M8',
    attendees: 152,
    avatars: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCGC1iCnQ4ahiwtRJQNv04b2TjOH-XPLXqPy6CWdBYRRjZX4TxyyF84wp1iZZKJwqz1R3zHZ5x0sDNNPm1i801-vh2RRrltbHT2ZVITB0ZlTMm7g-KwYDdzKS58Yu71rfwX_BkkEtuiGz8pFJvFZ_nfpd5iUv2g_gNALb6nO4uMBvRKhD-TgRCL4ppoMRiX7ul-IGFQuRxDiPPIuXJtBOYwIVZLiCj02NSTgj_tWbNztMsIGgA87WLSmldcTmlqRR5BN9nn92KEs5A',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAB6xJIaV5hrPfs3cB9p6cCLyriFrEP-c-OtIBImQzHdphLAtjQgvR1NovclepPDAOPoy98Q6s0MnJ1Cl5B2HcFvVtqlTbo7zTlyKN44FSubv5bJUeDDxwrDigiku8tN4MqN4xApYpFd42vlZ_xmvD9CUCkRbZaW2crm1PGff1Otkncw2SS6_BAmtehd24neymY-XT1_YTtGX8LP-iJLZxA_UhB8Kw319oe8R3SCWRg7Wzt5aGiN3bW1HHW9V74qAnEtGK2EW7Eutk',
    ]
  },
];

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
