export const COLLECTION_STATS = [
  { id: 'today', label: "Today's Intake", value: '₹1.4 L', icon: 'cash', color: '#059669' },
  { id: 'month', label: 'This Month', value: '₹38.6 L', icon: 'calendar', color: '#2563eb' },
  { id: 'pending', label: 'Pending Clearance', value: '₹2.1 L', icon: 'time', color: '#d97706' },
  { id: 'receipts', label: 'Receipts Issued', value: '1,286', icon: 'receipt', color: '#0284c7' },
];

export const RECENT_COLLECTIONS = [
  { id: 'C1', student: 'Aarav Mehta', rollNo: 'CSE-21-001', program: 'B.Tech CSE', sem: 'Sem 7', amount: '₹42,000', date: 'Today', method: 'UPI', status: 'Cleared', color: '#2563eb' },
  { id: 'C2', student: 'Priya Sharma', rollNo: 'ECE-21-014', program: 'B.Tech ECE', sem: 'Sem 7', amount: '₹42,000', date: 'Today', method: 'Net Banking', status: 'Cleared', color: '#059669' },
  { id: 'C3', student: 'Sneha Patel', rollNo: 'BBA-23-002', program: 'BBA', sem: 'Sem 5', amount: '₹38,000', date: 'Yesterday', method: 'Card', status: 'Cleared', color: '#d97706' },
  { id: 'C4', student: 'Rahul Verma', rollNo: 'ME-22-007', program: 'B.Tech ME', sem: 'Sem 5', amount: '₹18,000', date: 'Yesterday', method: 'Cash', status: 'Partial', color: '#dc2626' },
  { id: 'C5', student: 'Ananya Reddy', rollNo: 'CSE-23-005', program: 'B.Tech CSE', sem: 'Sem 5', amount: '₹42,000', date: 'Dec 6', method: 'UPI', status: 'Cleared', color: '#2563eb' },
  { id: 'C6', student: 'Arjun Nair', rollNo: 'CIV-21-011', program: 'B.Tech CE', sem: 'Sem 7', amount: '₹42,000', date: 'Dec 6', method: 'Cheque', status: 'Cleared', color: '#0891b2' },
];

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  { id: 'netbanking', label: 'Net Banking', icon: 'globe-outline' },
  { id: 'card', label: 'Card', icon: 'card-outline' },
  { id: 'cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'cheque', label: 'Cheque', icon: 'document-text-outline' },
];