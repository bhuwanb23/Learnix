// Color constants for Academic Details page
export const ACADEMIC_COLORS = {
    primary: '#0050d4',
    primaryDim: '#0046bb',
    primaryContainer: '#7b9cff',
    secondary: '#702ae1',
    tertiary: '#a23800',
    surface: '#f5f7f9',
    surfaceContainerLow: '#eef1f3',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerHigh: '#dfe3e6',
    surfaceContainerHighest: '#d9dde0',
    onSurface: '#2c2f31',
    onSurfaceVariant: '#595c5e',
    onPrimary: '#f1f2ff',
    background: '#f5f7f9',
    outline: '#747779',
    outlineVariant: '#abadaf',
    error: '#b31b25',
    success: '#2e7d32',
    green: '#4caf50',
    blue: '#2196f3',
};

// Academic profile data
export const ACADEMIC_DATA = {
    department: 'Department of Science',
    program: 'Artificial Intelligence & Machine Learning',
    school: 'School of Advanced Computing',
    class: 'Class of 2025',
    semester: '06',
    gpa: '3.92',
    gpaScale: '4.0',
    gpaTrend: '+0.05 vs last sem',
    creditsEarned: 114,
    creditsTotal: 140,
    creditsPercentage: 81,
    creditsRemaining: 26,
    graduationDate: 'Spring 2025',
    attendance: 90,
};

// Subject data
export const SUBJECTS = [
    {
        id: 1,
        name: 'Neural Networks & Deep Learning',
        code: 'CS-402',
        professor: 'Prof. Sarah Jenkins',
        icon: 'psychology',
        iconColor: ACADEMIC_COLORS.primary,
        credits: '4.0',
        grade: 'A+',
        gradeColor: '#10b981',
        gradeBg: '#d1fae5',
    },
    {
        id: 2,
        name: 'Advanced Database Systems',
        code: 'CS-405',
        professor: 'Prof. Robert Chen',
        icon: 'database',
        iconColor: ACADEMIC_COLORS.secondary,
        credits: '3.0',
        grade: 'A',
        gradeColor: '#2196f3',
        gradeBg: '#e3f2fd',
    },
    {
        id: 3,
        name: 'Cybersecurity Fundamentals',
        code: 'CS-412',
        professor: 'Prof. Alan Turing (Guest)',
        icon: 'terminal',
        iconColor: ACADEMIC_COLORS.tertiary,
        credits: '4.0',
        grade: 'In Progress',
        gradeColor: ACADEMIC_COLORS.onSurfaceVariant,
        gradeBg: ACADEMIC_COLORS.surfaceContainerHigh,
        isInProgress: true,
    },
];

// Course materials data
export const COURSE_MATERIALS = [
    {
        id: 1,
        title: 'Neural Networks Lab',
        due: 'Friday, 4:00 PM',
        icon: 'lab_profile',
        iconColor: ACADEMIC_COLORS.primary,
        borderColor: ACADEMIC_COLORS.primary,
    },
    {
        id: 2,
        title: 'Ethics in AI Essay',
        due: 'Monday, 10:00 AM',
        icon: 'history_edu',
        iconColor: ACADEMIC_COLORS.secondary,
        borderColor: ACADEMIC_COLORS.secondary,
    },
];
