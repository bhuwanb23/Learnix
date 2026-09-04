// Data constants for the create assignment page - teacher view

export const CREATE_HEADER = {
  title: 'Create Assignment',
  subtitle: 'Give a new assignment to a class',
};

export const FORM_FIELDS = [
  { key: 'title', label: 'Assignment Title', placeholder: 'e.g. Problem Set #05', icon: 'title', required: true },
  { key: 'description', label: 'Description', placeholder: 'What should students do? Add expectations, steps and submission format.', icon: 'notes', multiline: true },
  { key: 'points', label: 'Max Points', placeholder: 'e.g. 100', icon: 'star', keyboardType: 'number-pad', required: true },
];

export const CLASS_OPTIONS = [
  { id: 'CAL-101', label: 'CAL-101', full: 'Advanced Calculus' },
  { id: 'PHY-210', label: 'PHY-210', full: 'Theoretical Physics' },
  { id: 'PSY-402', label: 'PSY-402', full: 'Adv. Cognitive Psychology' },
];

export const DUE_OPTIONS = [
  { id: 'Oct 12', label: 'Oct 12' },
  { id: 'Oct 14', label: 'Oct 14' },
  { id: 'Oct 16', label: 'Oct 16' },
  { id: 'Oct 20', label: 'Oct 20' },
];

export const PUBLISH_LABEL = {
  title: 'Publish immediately',
  subtitle: 'Students can see and submit right away',
};

export const ATTACH_LABEL = 'Add attachment';