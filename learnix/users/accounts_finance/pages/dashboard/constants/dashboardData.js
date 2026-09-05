export const CASH_STATS = [
  { id: 'collected', label: 'Collected (Year)', value: '₹4.2 Cr', icon: 'cash', color: '#059669' },
  { id: 'target', label: 'Annual Target', value: '₹5.1 Cr', icon: 'trending-up', color: '#2563eb' },
  { id: 'dues', label: 'Total Dues', value: '₹42.6 L', icon: 'alert-circle', color: '#dc2626' },
  { id: 'payroll', label: 'Payroll (Month)', value: '₹38.4 L', icon: 'card', color: '#d97706' },
];

export const TODAY_COLLECTIONS = [
  { id: 'TC1', student: 'Aarav Mehta', program: 'B.Tech CSE', amount: '₹42,000', method: 'UPI', time: '10:24 AM', color: '#2563eb' },
  { id: 'TC2', student: 'Priya Sharma', program: 'B.Tech ECE', amount: '₹42,000', method: 'Net Banking', time: '11:05 AM', color: '#059669' },
  { id: 'TC3', student: 'Sneha Patel', program: 'BBA', amount: '₹38,000', method: 'Card', time: '12:40 PM', color: '#d97706' },
  { id: 'TC4', student: 'Rahul Verma', program: 'B.Tech ME', amount: '₹18,000', method: 'Cash', time: '2:15 PM', color: '#0284c7' },
];

export const BUDGET_UTILIZATION = [
  { id: 'B1', name: 'Academic Operations', used: 78, color: '#2563eb' },
  { id: 'B2', name: 'Infrastructure', used: 64, color: '#059669' },
  { id: 'B3', name: 'Salaries', used: 82, color: '#d97706' },
  { id: 'B4', name: 'Research & Labs', used: 45, color: '#0284c7' },
];

export const PENDING_APPROVALS = [
  { id: 'P1', title: 'Vendor payment — Lab equipment', detail: '₹4.8 L • Sigma Scientific', icon: 'receipt-outline', color: '#2563eb', target: 'Expenses' },
  { id: 'P2', title: '6 scholarship disbursements', detail: '₹3.2 L • Merit & need-based', icon: 'school-outline', color: '#059669', target: 'Scholarships' },
  { id: 'P3', title: 'Staff expense claims', detail: '14 claims • ₹86,000 total', icon: 'document-text-outline', color: '#d97706', target: 'Expenses' },
];

export const MODULES = [
  { id: 'Collections', label: 'Collections', desc: 'Record & track payments', icon: 'cash-outline', color: '#2563eb' },
  { id: 'Dues', label: 'Dues & Recovery', desc: 'Defaulters & reminders', icon: 'alert-circle-outline', color: '#dc2626' },
  { id: 'Payroll', label: 'Payroll', desc: 'Process staff salaries', icon: 'card-outline', color: '#d97706' },
  { id: 'FeeStructure', label: 'Fee Structure', desc: 'Program-wise fees', icon: 'pricetags-outline', color: '#059669' },
  { id: 'Expenses', label: 'Expenses', desc: 'Claims & vendor payments', icon: 'receipt-outline', color: '#0284c7' },
  { id: 'Scholarships', label: 'Scholarships', desc: 'Awards & disbursements', icon: 'school-outline', color: '#4f46e5' },
  { id: 'Reports', label: 'Reports', desc: 'Cash flow & exports', icon: 'analytics-outline', color: '#64748b' },
];

export const RECENT_ACTIVITY = [
  { id: 'A1', text: '₹42,000 received from Aarav Mehta (UPI)', time: '10 min ago', color: '#059669' },
  { id: 'A2', text: 'Salary run for November initiated', time: '1 hr ago', color: '#2563eb' },
  { id: 'A3', text: 'Library fine of ₹480 collected from 12 students', time: '3 hrs ago', color: '#059669' },
  { id: 'A4', text: 'Vendor invoice #V-221 approved — Printers', time: '5 hrs ago', color: '#d97706' },
];