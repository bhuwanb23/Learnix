// Data constants for the attendance report page - teacher view

export const REPORT_HEADER = {
  title: 'Attendance Report',
  subtitle: 'Monthly overview for this class',
};

export const REPORT_MONTH = {
  label: 'September 2026',
  year: 2026,
  month: 8, // 0-indexed (September)
};

export const MONTH_STATS = {
  present: 210,
  absent: 32,
  late: 12,
  excused: 9,
  lectures: 10,
  avgAttendance: 86,
};

// Status per lecture day of the month (day -> P/A/L/E). Days without lectures are omitted.
export const LECTURE_DAYS = {
  1: 'P',
  2: 'P',
  3: 'A',
  4: 'P',
  5: 'P',
  8: 'L',
  9: 'P',
  10: 'P',
  11: 'P',
  12: 'P',
  15: 'A',
  16: 'P',
  17: 'P',
  18: 'L',
  19: 'P',
  22: 'P',
  23: 'P',
  24: 'P',
  25: 'A',
  26: 'P',
  29: 'P',
  30: 'P',
};

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];