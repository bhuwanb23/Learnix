export const LIBRARY_STATS = [
  { id: 'books', label: 'Total Books', value: '24,580', icon: 'book', color: '#7c3aed' },
  { id: 'issued', label: 'Currently Issued', value: '1,240', icon: 'arrow-undo', color: '#059669' },
  { id: 'overdue', label: 'Overdue Books', value: '12', icon: 'alert', color: '#dc2626' },
  { id: 'fines', label: 'Fines Pending', value: '₹4,820', icon: 'cash', color: '#d97706' },
];

export const BOOKS = [
  { id: 'B1', title: 'Introduction to Algorithms', author: 'Cormen & Leiserson', category: 'Computer Science', copies: 12, available: 5, color: '#7c3aed' },
  { id: 'B2', title: 'Operating System Concepts', author: 'Silberschatz', category: 'Computer Science', copies: 10, available: 3, color: '#8b5cf6' },
  { id: 'B3', title: 'Digital Electronics', author: 'Morris Mano', category: 'Electronics', copies: 8, available: 2, color: '#059669' },
  { id: 'B4', title: 'Thermodynamics: An Engineering Approach', author: 'Cengel & Boles', category: 'Mechanical', copies: 6, available: 1, color: '#d97706' },
  { id: 'B5', title: 'Principles of Marketing', author: 'Kotler & Armstrong', category: 'Management', copies: 10, available: 6, color: '#dc2626' },
  { id: 'B6', title: 'Structural Analysis', author: 'R.C. Hibbeler', category: 'Civil', copies: 5, available: 0, color: '#0891b2' },
];

export const ISSUED_BOOKS = [
  { id: 'I1', student: 'Aarav Mehta', book: 'Introduction to Algorithms', dueDate: 'Oct 8, 2026', status: 'Issued', color: '#7c3aed' },
  { id: 'I2', student: 'Priya Sharma', book: 'Digital Electronics', dueDate: 'Oct 2, 2026', status: 'Overdue', color: '#dc2626' },
  { id: 'I3', student: 'Rahul Verma', book: 'Thermodynamics', dueDate: 'Oct 15, 2026', status: 'Issued', color: '#059669' },
  { id: 'I4', student: 'Sneha Patel', book: 'Principles of Marketing', dueDate: 'Sep 25, 2026', status: 'Overdue', color: '#dc2626' },
  { id: 'I5', student: 'Ananya Reddy', book: 'Operating System Concepts', dueDate: 'Oct 20, 2026', status: 'Issued', color: '#059669' },
];

export const BOOK_REQUESTS = [
  { id: 'R1', student: 'Isha Gupta', book: 'Signals & Systems', reason: 'Course reference', requestedAt: '2 hrs ago', color: '#059669' },
  { id: 'R2', student: 'Kabir Joshi', book: 'Python Crash Course', reason: 'Self-study', requestedAt: '5 hrs ago', color: '#7c3aed' },
  { id: 'R3', student: 'Meghna Das', book: 'Marketing Analytics', reason: 'Project research', requestedAt: 'Yesterday', color: '#d97706' },
];