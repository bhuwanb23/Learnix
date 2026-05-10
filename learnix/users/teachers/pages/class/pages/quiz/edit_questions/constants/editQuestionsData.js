export const HEADER = {
    title: 'Question Bank',
};

export const QUIZ_INFO = {
    title: 'Cell Biology 101',
    description: 'Curate and organize your question set. Use the handles to reorder or expand cards for detailed option management.',
};

export const QUESTIONS = [
    {
        id: 'q1',
        text: 'Which organelle is primarily responsible for protein synthesis in eukaryotic cells?',
        difficulty: 'Medium',
        type: 'MCQ',
        options: [
            { text: 'Mitochondria', isCorrect: false },
            { text: 'Ribosomes', isCorrect: true },
            { text: 'Golgi Apparatus', isCorrect: false },
            { text: 'Lysosomes', isCorrect: false },
        ],
    },
    {
        id: 'q2',
        text: 'The process of DNA replication occurs in which phase of the cell cycle?',
        difficulty: 'Hard',
        type: 'MCQ',
        options: [
            { text: 'G1 Phase', isCorrect: false },
            { text: 'S Phase', isCorrect: true },
            { text: 'G2 Phase', isCorrect: false },
            { text: 'M Phase', isCorrect: false },
        ],
    },
    {
        id: 'q3',
        text: 'What is the "Powerhouse of the Cell"?',
        difficulty: 'Easy',
        type: 'MCQ',
        options: [
            { text: 'Mitochondria', isCorrect: true },
            { text: 'Nucleus', isCorrect: false },
            { text: 'Cell Membrane', isCorrect: false },
            { text: 'Endoplasmic Reticulum', isCorrect: false },
            { text: 'Chloroplast', isCorrect: false },
        ],
    },
    {
        id: 'q4',
        text: 'Which cellular structure is responsible for packaging and shipping proteins?',
        difficulty: 'Medium',
        type: 'MCQ',
        options: [
            { text: 'Ribosomes', isCorrect: false },
            { text: 'Golgi Apparatus', isCorrect: true },
            { text: 'Mitochondria', isCorrect: false },
            { text: 'Nucleus', isCorrect: false },
        ],
    },
    {
        id: 'q5',
        text: 'What is the primary function of the cell membrane?',
        difficulty: 'Easy',
        type: 'MCQ',
        options: [
            { text: 'Protein synthesis', isCorrect: false },
            { text: 'Energy production', isCorrect: false },
            { text: 'Selective permeability', isCorrect: true },
            { text: 'DNA storage', isCorrect: false },
        ],
    },
];
