export const QUIZ_HEADER = {
    subject: 'ADVANCED NEUROSCIENCE',
    title: 'Synaptic Plasticity & Memory',
    description: 'Preview the student attempt experience. Correct answers are highlighted for your reference.',
    timeRemaining: '44:02',
};

export const QUESTIONS = [
    {
        id: 'q1',
        number: '01',
        points: '2.0 POINTS',
        type: 'multiple-choice',
        question: 'Which neurotransmitter is primarily responsible for long-term potentiation (LTP) in the hippocampal CA1 region?',
        options: [
            { label: 'A', text: 'GABA', correct: false },
            { label: 'B', text: 'Glutamate', correct: true },
            { label: 'C', text: 'Dopamine', correct: false },
            { label: 'D', text: 'Serotonin', correct: false },
        ],
    },
    {
        id: 'q2',
        number: '02',
        points: '4.0 POINTS',
        type: 'multi-select',
        question: 'Identify the structural changes associated with dendritic spine remodeling during memory consolidation.',
        hasImage: true,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKI1wsNyt3YrRvlz7SOFOW_LVeI2TXbpqwv5kC-7YLzomLjhSDLyppLXgQHPGA3zxFNEMCDe8ROnQqeldJ2tVE5lf_QB21p_nq3ALOUZVLKAelMLb1vZZK3vrXaGRD6caLxNKQgt5TgG2H3iW_ZANF8EBX7cSqLJUBf1j-ZMuWJMwyrmPyEPolOzQyfAlxKtzaQIXOZMPmAukYI8ZIteRXm6fSht85fcRUgwOBTrSZ8enhfdKyE_mPodsMLD5aXVsbvlXFPGl2444',
        options: [
            { label: 'A', text: 'Increase in mushroom spine density', correct: true },
            { label: 'B', text: 'Global reduction in protein synthesis', correct: false },
            { label: 'C', text: 'Actin cytoskeleton reorganization', correct: true },
        ],
    },
    {
        id: 'q3',
        number: '03',
        points: '5.0 POINTS',
        type: 'short-answer',
        question: 'Explain the role of NMDA receptors as coincidence detectors.',
        referenceKey: 'The NMDA receptor requires both glutamate binding (presynaptic activity) and postsynaptic depolarization to remove the magnesium block (Mg2+), thus acting as a molecular coincidence detector for LTP.',
    },
];

export const HEADER = {
    title: 'Quiz Preview',
    editButtonText: 'Edit Quiz',
};
