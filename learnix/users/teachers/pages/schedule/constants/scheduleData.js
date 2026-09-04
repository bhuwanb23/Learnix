export const SCHEDULE_DAYS = [
  {
    id: 'mon',
    label: 'Monday',
    date: 'Sep 7',
    items: [
      { id: 'm1', time: '09:00 – 10:30', title: 'Advanced Econometrics', location: 'Lecture Hall B, Floor 2', mode: 'campus', canJoin: false },
      { id: 'm2', time: '02:00 – 03:30', title: 'Data Analysis Seminar', location: 'Main Lab', mode: 'campus', canJoin: false },
    ],
  },
  {
    id: 'tue',
    label: 'Tuesday',
    date: 'Sep 8',
    items: [
      { id: 't1', time: '11:00 – 12:30', title: 'Macroeconomics 101', location: 'Virtual Classroom 4', mode: 'virtual', canJoin: true },
      { id: 't2', time: '04:00 – 05:00', title: 'Office Hours', location: 'Faculty Room 12', mode: 'campus', canJoin: false },
    ],
  },
  {
    id: 'wed',
    label: 'Wednesday',
    date: 'Sep 9',
    items: [
      { id: 'w1', time: '09:00 – 10:30', title: 'Advanced Econometrics', location: 'Lecture Hall B, Floor 2', mode: 'campus', canJoin: false },
      { id: 'w2', time: '01:00 – 02:30', title: 'Statistical Modeling Lab', location: 'Computing Lab 1', mode: 'campus', canJoin: false },
    ],
  },
  {
    id: 'thu',
    label: 'Thursday',
    date: 'Sep 10',
    items: [
      { id: 'th1', time: '11:00 – 12:30', title: 'Macroeconomics 101', location: 'Virtual Classroom 4', mode: 'virtual', canJoin: true },
      { id: 'th2', time: '03:00 – 04:00', title: 'Faculty Meeting', location: 'Conference Room 3', mode: 'campus', canJoin: false },
    ],
  },
  {
    id: 'fri',
    label: 'Friday',
    date: 'Sep 11',
    items: [
      { id: 'f1', time: '09:00 – 11:00', title: 'Midterm Exam — Macroeconomics', location: 'Hall B, Floor 2', mode: 'campus', canJoin: false },
      { id: 'f2', time: '02:00 – 03:30', title: 'Data Analysis Seminar', location: 'Main Lab', mode: 'campus', canJoin: false },
    ],
  },
];