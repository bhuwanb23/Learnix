// Data constants for the export grades page - teacher view

export const EXPORT_HEADER = {
  title: 'Export Grades',
  subtitle: 'Generate a grade report for a class',
};

export const FORMATS = [
  { id: 'csv', label: 'CSV', subtitle: 'Spreadsheet ready', icon: 'table-chart', color: '#16a34a' },
  { id: 'pdf', label: 'PDF', subtitle: 'Print friendly', icon: 'picture-as-pdf', color: '#b31b25' },
  { id: 'xlsx', label: 'Excel', subtitle: 'Formatted sheet', icon: 'grid-on', color: '#0050d4' },
];

export const CLASS_OPTIONS = [
  { id: 'CAL-101', label: 'CAL-101', full: 'Advanced Calculus' },
  { id: 'PHY-210', label: 'PHY-210', full: 'Theoretical Physics' },
  { id: 'PSY-402', label: 'PSY-402', full: 'Adv. Cognitive Psychology' },
];

export const PERIOD_OPTIONS = [
  { id: 'This month', label: 'This month' },
  { id: 'This semester', label: 'This semester' },
  { id: 'Full year', label: 'Full year' },
];