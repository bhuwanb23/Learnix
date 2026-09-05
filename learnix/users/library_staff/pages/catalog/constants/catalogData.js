export const CATALOG_STATS = [
  { id: 'books', label: 'Total Books', value: '24,580', icon: 'book', color: '#2563eb' },
  { id: 'titles', label: 'Unique Titles', value: '6,840', icon: 'library', color: '#059669' },
  { id: 'categories', label: 'Categories', value: '18', icon: 'pricetags', color: '#d97706' },
  { id: 'lowStock', label: 'Low Stock', value: '9', icon: 'alert-circle', color: '#dc2626' },
];

export const BOOKS = [
  { id: 'B1', title: 'Introduction to Algorithms', author: 'Cormen & Leiserson', category: 'Computer Science', isbn: '978-0262033848', copies: 12, available: 5, color: '#2563eb' },
  { id: 'B2', title: 'Operating System Concepts', author: 'Silberschatz', category: 'Computer Science', isbn: '978-1119800361', copies: 10, available: 3, color: '#3b82f6' },
  { id: 'B3', title: 'Digital Electronics', author: 'Morris Mano', category: 'Electronics', isbn: '978-9332585595', copies: 8, available: 2, color: '#059669' },
  { id: 'B4', title: 'Thermodynamics: An Engineering Approach', author: 'Cengel & Boles', category: 'Mechanical', isbn: '978-9814595292', copies: 6, available: 1, color: '#d97706' },
  { id: 'B5', title: 'Principles of Marketing', author: 'Kotler & Armstrong', category: 'Management', isbn: '978-1292341132', copies: 10, available: 6, color: '#dc2626' },
  { id: 'B6', title: 'Structural Analysis', author: 'R.C. Hibbeler', category: 'Civil', isbn: '978-1292089331', copies: 5, available: 0, color: '#0891b2' },
  { id: 'B7', title: 'Signals & Systems', author: 'Oppenheim & Willsky', category: 'Electronics', isbn: '978-0138147570', copies: 7, available: 4, color: '#4f46e5' },
  { id: 'B8', title: 'Python Crash Course', author: 'Eric Matthes', category: 'Computer Science', isbn: '978-1593279288', copies: 15, available: 8, color: '#0ea5e9' },
];

export const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Computer Science', value: 'Computer Science' },
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Mechanical', value: 'Mechanical' },
  { label: 'Management', value: 'Management' },
  { label: 'Civil', value: 'Civil' },
];