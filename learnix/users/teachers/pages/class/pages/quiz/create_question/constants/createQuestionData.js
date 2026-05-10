export const DEFAULT_QUIZ = {
    title: 'Advanced Cognitive Psychology: Midterm Assessment',
    topic: 'Cognitive Psychology',
    totalQuestions: 12,
    duration: 45,
    totalPoints: 250,
};

export const SAMPLE_QUESTIONS = [
    {
        id: 'q1',
        type: 'MCQ',
        text: 'Which neuroanatomical structure is primarily responsible for the encoding of long-term episodic memories?',
        options: [
            { text: 'The Amygdala complex', isCorrect: false },
            { text: 'The Hippocampal formation', isCorrect: true },
            { text: 'The Prefrontal cortex', isCorrect: false },
        ],
        points: 15,
        difficulty: 'Moderate',
    },
    {
        id: 'q2',
        type: 'TF',
        text: 'The "Cocktail Party Effect" demonstrates that individuals can selectively attend to one auditory stimulus while filtering out others.',
        selectedAnswer: 'True',
        correctAnswer: true,
        points: 5,
        difficulty: 'Easy',
    },
];

export const PROCORING_RULES = [
    { text: 'Camera Monitoring Active', enabled: true },
    { text: 'Browser Lockdown Enabled', enabled: true },
    { text: 'Multiple Attempts Disabled', enabled: false },
];
