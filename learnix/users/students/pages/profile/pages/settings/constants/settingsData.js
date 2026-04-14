// Color constants for Settings page
export const SETTINGS_COLORS = {
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

// User identity data
export const USER_IDENTITY = {
    name: 'Alex Thompson',
    email: 'alex.thompson@scholarflow.edu',
    tier: 'Premium Student Tier',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCT001KHWAl4IwgJK1_ULgURqVXG1flTf3x79o1aXth_qI2xRu_nvND2v40PWZSj_A-wnsYpCpXH5FZogdL5t6ITwu4ZwI0Fz1uZMKpe6nO5HeWmwZWj2LK9886NZOVOMKvyRxbdd7wXf2sEcvRVbZOwdvYyO52-t6pObj-5mdl8HlxTYsr4BmU0IRHwrcEIMl6DgJpti5_DxVPBF5saRidZJOkunr8W91O7OV7F_RpGghA56a6IWPiTp-pT04azZMh0cTuJdPdZyA',
    profilePhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDlt0yBR5Cc7Bkyz9Z0NCLUYx6GQaKYZX6qS0KdEFEry-HQ_osNegE4bntSfufWLK8TWhCZJ1d4PkebxYUHlka515kG5FWWWKMKtBJFYuq8seg6dZhaUXRCxOCOAqsLPQltg0j0eKjbeuDVmGQPb0pmIuUZo5x5bankjUvd_DQls1jX2hmO-WoWQb7PrC0_yk08Ko8mO8zUlhfcKsTl_Zg9dPSKG2u2ksPd_4whUlmv53IBwwLlhZp9UWquLw9t6hOxrjBWdah-EQ',
};

// Settings groups
export const SETTINGS_GROUPS = [
    {
        id: 'security',
        title: 'Security & Privacy',
        items: [
            {
                id: 'password',
                icon: 'lock',
                iconColor: SETTINGS_COLORS.primary,
                iconBg: `${SETTINGS_COLORS.primary}15`,
                label: 'Change Password',
                description: 'Update your account credentials',
            },
            {
                id: 'privacy',
                icon: 'security',
                iconColor: SETTINGS_COLORS.secondary,
                iconBg: `${SETTINGS_COLORS.secondary}15`,
                label: 'Privacy Settings',
                description: 'Control your data and visibility',
            },
        ],
    },
    {
        id: 'preferences',
        title: 'System Preferences',
        items: [
            {
                id: 'notifications',
                icon: 'notifications',
                iconColor: SETTINGS_COLORS.tertiary,
                iconBg: `${SETTINGS_COLORS.tertiary}15`,
                label: 'Notifications',
                description: 'Manage push and email alerts',
            },
            {
                id: 'help',
                icon: 'help',
                iconColor: SETTINGS_COLORS.onSurface,
                iconBg: SETTINGS_COLORS.surfaceContainerHigh,
                label: 'Help & Support',
                description: 'Get assistance and browse FAQs',
            },
        ],
    },
];

export const APP_VERSION = 'Scholar Flow v4.2.1-Premium';
