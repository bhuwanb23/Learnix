export const ATTENDANCE_STATS = [
  { id: 'overall', label: 'Today Overall', value: '94.2%', icon: 'checkmark-done', color: '#059669', trend: '1,162 of 1,234 present' },
  { id: 'late', label: 'Late Arrivals', value: '18', icon: 'time', color: '#d97706', trend: '3 more than yesterday' },
  { id: 'absent', label: 'Absent Today', value: '72', icon: 'person-remove', color: '#dc2626', trend: '5.8% of students' },
  { id: 'classes', label: 'Classes Held', value: '48', icon: 'school', color: '#7c3aed', trend: 'of 52 scheduled' },
];

export const CLASS_ATTENDANCE = [
  { id: 'C1', name: 'CSE-A (Sem 5)', students: 62, present: 59, pct: 95, color: '#7c3aed' },
  { id: 'C2', name: 'CSE-B (Sem 5)', students: 58, present: 53, pct: 91, color: '#8b5cf6' },
  { id: 'C3', name: 'ECE-A (Sem 3)', students: 60, present: 57, pct: 95, color: '#059669' },
  { id: 'C4', name: 'ME-A (Sem 5)', students: 55, present: 47, pct: 85, color: '#d97706' },
  { id: 'C5', name: 'BBA-A (Sem 1)', students: 48, present: 44, pct: 92, color: '#dc2626' },
  { id: 'C6', name: 'CIV-A (Sem 7)', students: 44, present: 40, pct: 91, color: '#0891b2' },
];

export const RECENT_ABSENT = [
  { id: 'A1', name: 'Vikram Singh', rollNo: 'CSE-22-021', class: 'CSE-A (Sem 5)', daysAbsent: 6, color: '#dc2626' },
  { id: 'A2', name: 'Rahul Verma', rollNo: 'MEC-22-008', class: 'ME-A (Sem 5)', daysAbsent: 5, color: '#d97706' },
  { id: 'A3', name: 'Farhan Ali', rollNo: 'MEC-24-003', class: 'ME-A (Sem 5)', daysAbsent: 4, color: '#d97706' },
  { id: 'A4', name: 'Sneha Patel', rollNo: 'BBA-23-003', class: 'BBA-A (Sem 1)', daysAbsent: 3, color: '#d97706' },
];