// Mock data for class page components - Matching classes.html design

export const mockClassData = {
  semester: 'Fall Semester 2024',
  credits: '18 Credits Enrolled',
  liveClass: {
    subject: 'Advanced Macroeconomics',
    professor: 'Prof. Elena Sterling',
    time: '10:30 AM - 12:00 PM',
    materials: 12,
    status: 'Live Now',
  },
};

export const mockQuickActions = [
  {
    id: 'lecture-notes',
    title: 'Lecture Notes',
    icon: 'description',
    color: '#0050d4',
    bgColor: 'rgba(0, 80, 212, 0.1)',
  },
  {
    id: 'practice-quizzes',
    title: 'Practice Quizzes',
    icon: 'quiz',
    color: '#702ae1',
    bgColor: 'rgba(112, 42, 225, 0.1)',
  },
  {
    id: 'syllabus-tracker',
    title: 'Syllabus Tracker',
    icon: 'checklist',
    color: '#a23800',
    bgColor: 'rgba(162, 56, 0, 0.1)',
  },
  {
    id: 'weak-topics',
    title: 'Weak Topics',
    icon: 'priority_high',
    color: '#b31b25',
    bgColor: 'rgba(179, 27, 37, 0.1)',
  },
];

export const mockCourses = [
  {
    id: 'molecular-biology',
    name: 'Molecular Biology II',
    professor: 'Dr. Julian Vance',
    professorImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMRl8biLPQ3Dk8ocBgBKnA6chzmsvJw26o8TJqnTu-MJBsAc23Vg-whsKIfQSgdMYARgLnr2MjjLdrqlJz6wCJ9SIk3KgBnWWd2oxprom6ewLrs8enxRlM__Pcf-aJ_Z62mqU1dhfWUxeJH7T3dC4DHEui_kK3PMtbuiZ32EFxL8IaLRlG-6d8yw4ijW_B-3bhl1L-pkdQTw8WOp0fjOuyqIqfpPXKNCYLz3ZHLJt-Exf3TYHg2te-Xx0OTCWbSblDEc4790udeTI',
    progress: 78,
    grade: 'A-',
    color: '#0050d4',
    milestone: {
      title: 'CRISPR Lab Report',
      date: 'Oct 20',
    },
  },
  {
    id: 'world-history',
    name: 'World History: Modern Era',
    professor: 'Prof. Sarah Jenkins',
    professorImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDelrPG13W_h8SIuSP1kEw7J7rIWu2HKBocoJHPCtJJO9-ZeK_trxNhhUvV6KjzYyAtt0Mg6NKV01v7ZTHIT-BHVVVyRYQ8FqN-hpvHS0DR5duGKY5UIbqdpqmlSllMVAWsc30MTx5TYaMtgp36vJ9zc5eDOUAQB76AKSwbP7fbk9hi6O71IKoT3on8njZcLmbD91XIDTCFvBKWZv7o_HdZ6cPhr5-VU2eRFjB2EKsW8wAe5DbdGG1o_Qu3FOEirEObIDWYP7DGr14',
    progress: 45,
    grade: 'B+',
    color: '#702ae1',
    milestone: {
      title: 'Modern Era Essay',
      date: 'Oct 21',
    },
  },
  {
    id: 'statistical-analysis',
    name: 'Statistical Analysis',
    professor: 'Dr. Marcus Thorne',
    professorImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKnQpLIMMr_MEvYR9uCqSMKdjJF-psp-tsGmZKsobv3C0NXY-Ivx62v9mMcmSG75e4HJXpgJEfpvwkxZOfpwNmQAgzvtljTrQINr2QlHMQqvzc70IPYaAZ1pqe9vq2u3xSmmxRnKJ8_EtzGRRvrdo4faFiz0J-p0PEV4dK94dBUlirPA0zY70ytHWfpfK9WX5q60oipEOF-ZQps6961YT56x5siG_2GNCGJx2fGFWynCCB4KCCVlbuU0pz4u_dV6va0BO0M1LpzGE',
    progress: 92,
    grade: 'A+',
    color: '#a23800',
    milestone: {
      title: 'Unit 4 Quiz',
      date: 'Oct 25',
    },
  },
];

export const mockAIRecommendations = {
  title: 'AI Study Guide',
  message: 'Based on your last Statistics quiz, you should focus on Standard Deviation.',
  highlight: 'Standard Deviation',
  resources: [
    {
      id: 1,
      type: 'Video Lesson',
      title: 'Mastering Variance (12m)',
      icon: 'play_circle',
    },
    {
      id: 2,
      type: 'Practice Set',
      title: '15 Probability Problems',
      icon: 'description',
    },
  ],
};

export const mockUpcomingTests = [
  {
    id: 1,
    title: 'Genetics Midterm',
    date: 'Oct 14 • 09:00 AM',
    daysLeft: 'In 2 Days',
    urgency: 'high',
    color: '#b31b25',
  },
  {
    id: 2,
    title: 'Macroeconomics Quiz',
    date: 'Oct 17 • 11:30 AM',
    daysLeft: 'In 5 Days',
    urgency: 'medium',
    color: '#a23800',
  },
  {
    id: 3,
    title: 'Modern History Essay',
    date: 'Oct 21 • 23:59 PM',
    daysLeft: 'Next Week',
    urgency: 'low',
    color: '#0050d4',
  },
];

export const mockPerformanceStats = {
  gpa: 3.92,
  trend: '+0.12 this term',
  chart: [8, 12, 6, 10, 14, 9], // Heights for bar chart
};
