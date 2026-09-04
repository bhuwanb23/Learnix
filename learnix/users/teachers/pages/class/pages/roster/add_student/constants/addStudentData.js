// Data constants for the add student page - teacher view

export const ADD_STUDENT_HEADER = {
  title: 'Add Student',
  subtitle: 'Enroll a new student into this class',
};

export const FORM_FIELDS = [
  { key: 'firstName', label: 'First Name', placeholder: 'e.g. Aarav', icon: 'person', required: true },
  { key: 'lastName', label: 'Last Name', placeholder: 'e.g. Sharma', icon: 'person', required: true },
  { key: 'studentId', label: 'Student ID', placeholder: 'e.g. 22BSCS099', icon: 'badge', required: true },
  { key: 'email', label: 'Email', placeholder: 'student@learnix.edu', icon: 'mail', keyboardType: 'email-address' },
  { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', icon: 'phone', keyboardType: 'phone-pad' },
  { key: 'guardian', label: 'Guardian Name', placeholder: 'Parent / guardian', icon: 'favorite' },
  { key: 'section', label: 'Section', placeholder: 'e.g. Section B', icon: 'group' },
];

export const ACTIONS = {
  cancel: 'Cancel',
  save: 'Save & Enroll',
};