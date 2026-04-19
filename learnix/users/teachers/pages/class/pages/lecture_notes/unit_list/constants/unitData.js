export const UNITS = [
    {
        id: 'unit-1',
        unitNumber: 1,
        title: 'Introduction to Data Structures',
        description: 'Foundational concepts, memory management, and Big O notation analysis.',
        topicsCount: 8,
        status: 'COMPLETED',
        statusColor: '#10b981',
        statusBg: '#d1fae5',
    },
    {
        id: 'unit-2',
        unitNumber: 2,
        title: 'Non-Linear Structures: Trees',
        description: 'Binary Search Trees, AVL Trees, and Heap implementations for priority queues.',
        topicsCount: 12,
        status: 'IN PROGRESS',
        statusColor: '#f59e0b',
        statusBg: '#fef3c7',
    },
    {
        id: 'unit-3',
        unitNumber: 3,
        title: 'Hashing & Tables',
        description: 'Collision resolution strategies, load factors, and dynamic resizing logic.',
        topicsCount: 6,
        status: 'PENDING',
        statusColor: '#6b7280',
        statusBg: '#f3f4f6',
    },
];

export const HEADER = {
    title: 'Manage Units',
    courseName: 'Data Structures',
};

export const BREADCRUMB = [
    { label: 'Data Structures', active: false },
    { label: 'Units', active: true },
];
