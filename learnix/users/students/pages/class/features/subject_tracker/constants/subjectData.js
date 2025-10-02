export const SUBJECT_TRACKER_DATA = {
  overallProgress: {
    percentage: 68,
    completedTopics: 12,
    totalTopics: 18,
  },
  
  subjects: [
    {
      id: 'math',
      name: 'Mathematics',
      icon: 'calculator-outline',
      unitsCount: 4,
      topics: 12,
      progress: 75,
      units: [
        {
          id: 'math-unit1',
          name: 'Unit 1: Algebra',
          status: 'complete',
          progress: 100,
          topics: [
            {
              id: 'linear-equations',
              name: 'Linear Equations',
              completed: true,
            },
            {
              id: 'quadratic-functions',
              name: 'Quadratic Functions',
              completed: true,
            },
          ],
        },
        {
          id: 'math-unit2',
          name: 'Unit 2: Geometry',
          status: 'in-progress',
          progress: 67,
          topics: [
            {
              id: 'triangles',
              name: 'Triangles',
              completed: true,
            },
            {
              id: 'circles',
              name: 'Circles',
              completed: true,
            },
            {
              id: 'polygons',
              name: 'Polygons',
              completed: false,
              missedClass: true,
              resources: [
                {
                  type: 'study-guide',
                  title: 'Study Guide: Polygons Basics',
                },
                {
                  type: 'video',
                  title: 'Video: Understanding Polygons',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'physics',
      name: 'Physics',
      icon: 'nuclear-outline',
      unitsCount: 3,
      topics: 9,
      progress: 60,
      units: [
        {
          id: 'physics-unit1',
          name: 'Unit 1: Mechanics',
          status: 'in-progress',
          progress: 33,
          topics: [
            {
              id: 'newtons-laws',
              name: "Newton's Laws",
              completed: true,
            },
            {
              id: 'motion-forces',
              name: 'Motion & Forces',
              completed: false,
            },
          ],
        },
      ],
    },
    {
      id: 'chemistry',
      name: 'Chemistry',
      icon: 'flask-outline',
      unitsCount: 3,
      topics: 8,
      progress: 50,
      units: [],
    },
  ],
};

export const AI_CHAT_RESPONSES = {
  default: "I understand your question. Let me provide a detailed explanation with examples...",
  topics: {
    'Linear Equations': 'Linear equations are algebraic equations where each term is either a constant or the product of a constant and a single variable. They form straight lines when graphed.',
    'Quadratic Functions': 'Quadratic functions are polynomial functions of degree 2. They have the form f(x) = ax² + bx + c and create parabolic curves when graphed.',
    'Triangles': 'Triangles are three-sided polygons. The sum of their interior angles is always 180°. There are different types: equilateral, isosceles, and scalene.',
    'Circles': 'A circle is a round shape where all points are equidistant from the center. Key measurements include radius, diameter, circumference, and area.',
    'Polygons': 'Polygons are closed figures made up of straight line segments. They are classified by the number of sides: triangle (3), quadrilateral (4), pentagon (5), etc.',
    "Newton's Laws": "Newton's three laws of motion describe the relationship between forces and motion. They form the foundation of classical mechanics.",
    'Motion and Forces': 'Motion is the change in position over time. Forces cause changes in motion according to Newton\'s laws. Key concepts include velocity, acceleration, and momentum.',
  },
};
