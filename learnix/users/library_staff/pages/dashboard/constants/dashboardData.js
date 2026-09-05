export const LIBRARY_STATS = [
  { id: 'books', label: 'Total Books', value: '24,580', icon: 'book', color: '#2563eb' },
  { id: 'issued', label: 'Currently Issued', value: '1,240', icon: 'swap-horizontal', color: '#059669' },
  { id: 'overdue', label: 'Overdue Books', value: '12', icon: 'alert-circle', color: '#dc2626' },
  { id: 'fines', label: 'Fines Pending', value: '₹4,820', icon: 'cash', color: '#d97706' },
];

export const DUE_TODAY = [
  { id: 'D1', student: 'Aarav Mehta', rollNo: 'CSE-21-001', book: 'Introduction to Algorithms', due: 'Due today', color: '#2563eb' },
  { id: 'D2', student: 'Priya Sharma', rollNo: 'ECE-21-014', book: 'Digital Electronics', due: 'Overdue 6 days', color: '#dc2626' },
  { id: 'D3', student: 'Rahul Verma', rollNo: 'ME-22-007', book: 'Thermodynamics', due: 'Due tomorrow', color: '#059669' },
  { id: 'D4', student: 'Ananya Reddy', rollNo: 'CSE-23-005', book: 'Operating System Concepts', due: 'Due today', color: '#2563eb' },
];

export const POPULAR_BOOKS = [
  { id: 'P1', title: 'Introduction to Algorithms', author: 'Cormen & Leiserson', borrowed: 96, color: '#2563eb' },
  { id: 'P2', title: 'Python Crash Course', author: 'Eric Matthes', borrowed: 84, color: '#059669' },
  { id: 'P3', title: 'Operating System Concepts', author: 'Silberschatz', borrowed: 71, color: '#d97706' },
  { id: 'P4', title: 'Digital Electronics', author: 'Morris Mano', borrowed: 58, color: '#0284c7' },
];

export const PENDING_TASKS = [
  { id: 'T1', title: '3 book requests to review', detail: 'Isha • Kabir • Meghna', icon: 'cart-outline', color: '#2563eb', target: 'Requests' },
  { id: 'T2', title: '12 overdue books', detail: '₹4,820 in fines collectible', icon: 'alert-circle-outline', color: '#dc2626', target: 'Fines' },
  { id: 'T3', title: '2 books low on stock', detail: 'Structural Analysis • Signals & Systems', icon: 'book-outline', color: '#d97706', target: 'Catalog' },
];

export const MODULES = [
  { id: 'Catalog', label: 'Catalog', desc: 'Manage books & stock', icon: 'book-outline', color: '#2563eb' },
  { id: 'Circulation', label: 'Circulation', desc: 'Issue & return books', icon: 'swap-horizontal-outline', color: '#059669' },
  { id: 'Fines', label: 'Fines & Overdues', desc: 'Collect & waive fines', icon: 'cash-outline', color: '#d97706' },
  { id: 'Requests', label: 'Book Requests', desc: 'Approve student requests', icon: 'cart-outline', color: '#0284c7' },
  { id: 'DigitalLibrary', label: 'Digital Library', desc: 'E-books & resources', icon: 'cloud-outline', color: '#4f46e5' },
  { id: 'Notifications', label: 'Notify Students', desc: 'Due date reminders', icon: 'megaphone-outline', color: '#dc2626' },
];

export const RECENT_ACTIVITY = [
  { id: 'A1', text: '3 books issued at the circulation desk', time: '15 min ago', color: '#2563eb' },
  { id: 'A2', text: 'Fine of ₹120 collected from Priya Sharma', time: '1 hr ago', color: '#059669' },
  { id: 'A3', text: 'New request: "Signals & Systems" (Isha Gupta)', time: '2 hrs ago', color: '#d97706' },
  { id: 'A4', text: '12 new books added to the catalog', time: '4 hrs ago', color: '#059669' },
];