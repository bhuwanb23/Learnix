// Color constants for Certifications page
export const CERTIFICATION_COLORS = {
    primary: '#0050d4',
    primaryDim: '#0046bb',
    primaryContainer: '#7b9cff',
    primaryFixed: '#7b9cff',
    primaryFixedDim: '#658eff',
    secondary: '#702ae1',
    secondaryContainer: '#dcc9ff',
    secondaryFixed: '#dcc9ff',
    secondaryFixedDim: '#d0b8ff',
    secondaryDim: '#6411d5',
    tertiary: '#a23800',
    tertiaryContainer: '#ff956a',
    tertiaryFixed: '#ff956a',
    tertiaryFixedDim: '#ff7e48',
    tertiaryDim: '#8e3000',
    surface: '#f5f7f9',
    surfaceDim: '#d0d5d8',
    surfaceBright: '#f5f7f9',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#eef1f3',
    surfaceContainer: '#e5e9eb',
    surfaceContainerHigh: '#dfe3e6',
    surfaceContainerHighest: '#d9dde0',
    onSurface: '#2c2f31',
    onSurfaceVariant: '#595c5e',
    onPrimary: '#f1f2ff',
    onSecondary: '#f8f0ff',
    onTertiary: '#ffefeb',
    background: '#f5f7f9',
    outline: '#747779',
    outlineVariant: '#abadaf',
    error: '#b31b25',
    errorContainer: '#fb5151',
};

// Summary data
export const SUMMARY_DATA = {
    totalCertificates: 12,
    currentTerm: 4,
    masteryProgress: 75,
    topPercent: 5,
};

// Filter options
export const FILTERS = [
    { id: 'all', label: 'All', active: true },
    { id: '2024', label: '2024', active: false },
    { id: '2023', label: '2023', active: false },
];

// Certificates data
export const CERTIFICATES = [
    {
        id: 1,
        title: 'Advanced UI/UX Systems',
        category: 'Design',
        categoryColor: CERTIFICATION_COLORS.primary,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClCbsNIGDIPmr-AIrUla8XqGgfdxzGquRPMcA6o9DYyNXZgOWIzysq3Gy0BebmZTafNV1CB2LnWST1UUAo_Hc30Eo5xEJc94mJ3aPRl5kuF9hTgKCacrL9hA7_JBY42xTLIbpQSjcawelpEN0_mbaEr9QAR615anErucVLSTdmUVRSCyhSNTkT7yakzGtG6qeHr_JaHEp78KlrAkC01WOi7bNfphr-k-jwS5F7TNpcQBlF67nNtaOt0sLP6rjpQ7uHh2qs44ZGrdM',
        date: 'Completed Oct 24, 2023',
    },
    {
        id: 2,
        title: 'Modern JavaScript Mastery',
        category: 'Development',
        categoryColor: CERTIFICATION_COLORS.secondary,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkjEB-unYMg-rz0MrhHJ8xjyUGu4CzAx0EW7P6bktB3th0i3DTkwCVl73HF2dG1PmdJ37XLUQvHXbiAUbEcf0f5x4ySzjyRZ32DdY7jpAeVcAJEiQjwBI5R2v9CLLVS4SmOB6hEEeY6OGodCjYLkLeYmHBlGAKd_hv7SIdIEVXXtzGtmJaPfAhkVwdbeQvq1_jYamLSzJmDWmcHIOYqy6iCtRn0QibDaeUXw_X8l4sH-EUX0fSqRepS15nFvpUJRXIzN67IP0BIX0',
        date: 'Completed Sep 12, 2023',
    },
    {
        id: 3,
        title: 'Data Structures & Analysis',
        category: 'Data',
        categoryColor: CERTIFICATION_COLORS.tertiary,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4rXwpWc_NzDYgrHgpMoHGrdjuquSkxQ_Rbkh6BP0AHYepkooMRNTfb1-5dMx_sNTIl8Rwfxxqffu64nvoq9oTx3CFAo0ba2JeFX5u0AP2xwmm1hK-dSXmf1V8qVHHhIiJkmlIwlYFWsiwcOMn2RQrpYjclzXzjrelqsKCh1ht-muLA6_Ej4fUl3M6Uk2lzOQdieqv_wy_pcleRZD9INu-B1eEF3pLNXGfqt2HMMbcKFSUaG7PafgfUcL4_18TSIZJLgxPYmVMo-8',
        date: 'Completed Aug 05, 2023',
    },
    {
        id: 4,
        title: 'Strategic Management',
        category: 'Business',
        categoryColor: CERTIFICATION_COLORS.primary,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWdPysssS3Z6H2WYAE12vuE029XLab5uQBrm8qPqakK1GFYCqlYCQHnwAiaXD6c1brid7qqnnwy_KZmnEUUXY_rVZ_dwgCi1kayETnUv3Knw87cQOSiNOB478qRP56O4lsQ_C4r3rLB3SwDqkqby692pzcWkhG4X-6emfDWNlDLboNvvPkKUHzkINUcgIeE5Qmlmwp2uLzgYDsXqE7CuGvcp6Jn_FqS4H-Quh4AEzcmoatuVnZvD0oD6rPbwg0eFChzJNnV6ph7E0',
        date: 'Completed Jul 19, 2023',
    },
];
