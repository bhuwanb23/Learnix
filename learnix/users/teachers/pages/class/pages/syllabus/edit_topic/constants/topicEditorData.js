export const HEADER = {
  eyebrow: 'Curator / Editor',
  title: 'Edit Syllabus Unit',
};

export const BREADCRUMB = ['Neuroscience 301', 'Unit 02: Memory Consolidation', 'Edit Topic'];

export const MODULE_PILL = {
  icon: 'school',
  label: 'MODULE 2.1',
};

export const DEFAULT_TOPIC = {
  title: 'Edit Topic: Long-Term Potentiation (LTP) Mechanics',
};

export const SAVE_STATUS = {
  icon: 'schedule',
  label: 'Autosaved 2m ago',
};

export const STATUS_TABS = [
  { id: 'Draft', label: 'Draft', dotColor: '#abadaf' },
  { id: 'Scheduled', label: 'Scheduled', dotColor: '#a23800' },
  { id: 'In Progress', label: 'In Progress', dotColor: '#0050d4' },
  { id: 'Completed', label: 'Completed', dotColor: '#702ae1' },
];

export const SECTION_1 = {
  icon: 'feed',
  iconBg: 'rgba(0, 80, 212, 0.1)',
  iconColor: '#0050d4',
  title: '1. Basic Topic Information',
  subtitle: 'Core identity, catalog identifiers, and syllabus scope',
  stepLabel: 'Step 1 of 4',
};

export const BASIC_INFO = {
  title: {
    label: 'Topic Title',
    required: true,
    placeholder: 'e.g. Synaptic Plasticity Foundations',
    value: 'Long-Term Potentiation (LTP) Mechanics',
  },
  code: {
    label: 'Syllabus Code',
    autoLabel: 'Auto-mapped',
    value: 'PSY-U2-T01',
  },
  duration: {
    icon: 'hourglass-top',
    title: 'Estimated Teaching Duration',
    subtitle: 'Allocated classroom hours & lecture blocks',
    unit: 'Hours',
    step: 0.5,
    min: 0.5,
    max: 12,
    value: 2.5,
    lecturesLabel: '(2 Lectures)',
  },
  description: {
    label: 'Pedagogical Objective & Syllabus Abstract',
    markdownLabel: 'Markdown supported',
    placeholder: 'Outline primary learning milestones...',
    value:
      'Covers molecular cascades of NMDA/AMPA receptors, CaMKII activation, and early vs late phase potentiation in CA1 pyramidal neurons with empirical lab models.',
  },
};

export const SECTION_2 = {
  icon: 'psychology',
  iconBg: 'rgba(112, 42, 225, 0.1)',
  iconColor: '#702ae1',
  title: '2. Curriculum Alignment & Cognitive Depth',
  subtitle: 'Taxonomy benchmarks, challenge level, and module weight',
};

export const CURRICULUM = {
  bloomLabel: "Target Bloom's Taxonomy Level",
  bloomHint: 'Higher-Order Thinking',
  bloomOptions: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate'],
  bloomDefault: 'Analyze',
  difficultyLabel: 'Cognitive Difficulty',
  difficultyOptions: ['Beginner', 'Intermediate', 'Advanced'],
  difficultyDefault: 'Intermediate',
  weightLabel: 'Curriculum Weight Tag',
  weightOptions: [
    { id: 'core', label: 'Core Curriculum', checked: true },
    { id: 'exam', label: 'Exam Crucial', checked: false },
    { id: 'elective', label: 'Bonus / Elective', checked: false },
  ],
};

export const SECTION_3 = {
  icon: 'folder-open',
  iconBg: 'rgba(162, 56, 0, 0.1)',
  iconColor: '#a23800',
  title: '3. Learning Materials & Linked Resources',
  subtitle: 'Classroom slide decks, reading literature, and formative assessments',
  linkedLabel: '3 Linked',
};

export const RESOURCES = [
  {
    id: 'res-1',
    icon: 'picture-as-pdf',
    iconBg: 'rgba(179, 27, 37, 0.1)',
    iconColor: '#b31b25',
    type: 'Lecture Slides',
    typeColor: '#0050d4',
    size: '14.8 MB',
    fileName: 'LTP_Molecular_Mechanisms_v3.pdf',
  },
  {
    id: 'res-2',
    icon: 'article',
    iconBg: 'rgba(112, 42, 225, 0.1)',
    iconColor: '#702ae1',
    type: 'Reading Packet',
    typeColor: '#702ae1',
    size: '2.1 MB',
    fileName: 'Bliss_Lomo_1973_Classic_Paper.pdf',
  },
];

export const LINKED_QUIZ = {
  icon: 'quiz',
  iconBg: 'rgba(0, 80, 212, 0.1)',
  iconColor: '#0050d4',
  label: 'LINKED FORMATIVE CHECK',
  title: 'Unit 2: LTP & Synaptic Plasticity Quiz',
  questions: '15 Questions',
  classAvg: 'Class Avg: 92%',
  buttonLabel: 'Change Quiz',
  buttonIcon: 'swap-horiz',
};

export const SECTION_4 = {
  icon: 'calendar-month',
  iconBg: 'rgba(0, 80, 212, 0.1)',
  iconColor: '#0050d4',
  title: '4. Teaching Delivery & Schedule',
  subtitle: 'Logistical execution, venue parameters, and private instructor guide',
};

export const DELIVERY = {
  date: {
    label: 'Delivery Date',
    icon: 'event',
    iconColor: '#0050d4',
    value: 'Oct 19, 2024',
  },
  room: {
    label: 'Classroom / Format Mode',
    icon: 'meeting-room',
    iconColor: '#702ae1',
    value: 'Hall B • Lecture + Laboratory Demonstration',
  },
  privateNotes: {
    label: "Teacher's Private Notes & Talking Points",
    icon: 'lock',
    iconColor: '#a23800',
    facultyLabel: 'FACULTY ONLY',
    placeholder: '• Start with Bliss & Lomo historical graph...',
    value:
      '• Start with 1973 rabbit perforant path historical data (slide 3)\n• Pause for 3 min check-in: Ask students why Mg2+ acts as voltage-dependent plug in NMDA\n• Highlight CaMKII phosphorylation of AMPA GluA1 subunits (critical for Midterm exam)\n• Live Sim: Load hippocampal slice electrophysiology model on projector before lab wrap-up',
  },
};

export const VISUAL_ASSET = {
  image:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDuNxWnayWcki4FPivt5Z_jsruyJjyoA5Vnlhmub5sWepDVNZN8TA4M58xAOSdijEqAAWQus57Yk-i5myzBwTRxRuc7_5MHhJ5zvg0id-EZwM4AFXeVzXo3dsphoSvTEWvVzd-zZMY_j2nAfku9zFKVrlADeDxAmKoMI3zGf4l9KT7_dkTKFpGTGdiPG2WPnKDx0MjKVo9yOox9pUakUZjPUGIxIYtRjO-gn9XBUjrGRzR6jTH8HWRA',
  eyebrow: 'COURSE VISUAL ASSET LINKED',
  fileName: 'Synapse-LTP-Render.png',
  caption:
    'This diagram will automatically be rendered into student syllabus preview cards and mobile flashcard revision modules.',
};
