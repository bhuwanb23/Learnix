export const QUIZ_REVIEW_COLORS = {
  primary: '#0050d4',
  primaryDim: '#0046bb',
  primaryContainer: '#7b9cff',
  secondary: '#702ae1',
  secondaryContainer: '#dcc9ff',
  error: '#b31b25',
  errorContainer: '#fb5151',
  surface: '#f5f7f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eef1f3',
  surfaceContainerHigh: '#dfe3e6',
  surfaceContainer: '#e5e9eb',
  onSurface: '#2c2f31',
  onSurfaceVariant: '#595c5e',
  onPrimary: '#f1f2ff',
  outlineVariant: '#abadaf',
  success: '#10b981',
  successLight: '#d1fae5',
  errorLight: '#fee2e2',
};

export const QUIZ_REVIEW_DATA = {
  score: 85,
  totalQuestions: 24,
  correctAnswers: 20,
  performanceTitle: 'Exceptional Progress',
  performanceDescription: "You've mastered the core concepts. Focus on advanced topics for the next session.",
};

export const SAMPLE_QUESTIONS = [
  {
    id: 1,
    number: '01',
    question: "Which of the following best describes the 'Multiplier Effect' in Keynesian economics?",
    options: [
      {
        id: 'A',
        text: 'The process by which an increase in savings leads to a decrease in overall national income.',
        isCorrect: false,
        isUserSelected: false,
      },
      {
        id: 'B',
        text: 'The proportional amount of increase in final income that results from an injection of spending.',
        isCorrect: true,
        isUserSelected: true,
      },
      {
        id: 'C',
        text: 'The effect of tax increases on the marginal propensity to consume across different demographics.',
        isCorrect: false,
        isUserSelected: false,
      },
    ],
    explanation: "The multiplier effect occurs when an initial injection of spending into the economy causes a larger final increase in national income. This happens because that injection of spending becomes someone else's income, a portion of which is then spent again, creating a continuous cycle. The magnitude of the multiplier depends on the Marginal Propensity to Consume (MPC).",
    isCorrect: true,
  },
  {
    id: 2,
    number: '02',
    question: 'In a perfectly competitive market, what is the relationship between Price (P), Marginal Revenue (MR), and Average Revenue (AR)?',
    options: [
      {
        id: 'A',
        text: 'P > MR = AR',
        isCorrect: false,
        isUserSelected: true,
      },
      {
        id: 'B',
        text: 'P = MR = AR',
        isCorrect: true,
        isUserSelected: false,
      },
      {
        id: 'C',
        text: 'P = MR > AR',
        isCorrect: false,
        isUserSelected: false,
      },
    ],
    explanation: "In perfect competition, individual firms are 'price takers,' meaning they must accept the market equilibrium price. Because they can sell any quantity at this market price, every additional unit sold adds exactly the price amount to total revenue (P=MR), and the average revenue per unit is also the price (P=AR). Your choice (A) typically applies to a Monopoly, where the firm must lower prices to sell more units, making MR less than P.",
    isCorrect: false,
  },
];
