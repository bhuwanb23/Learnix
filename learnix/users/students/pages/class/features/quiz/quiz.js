import React, { useState } from 'react';
import SubjectDirectoryPage from './subject_directory/subject_directory';
import UnitDirectoryPage from './unit_directory/unit_directory';

export default function QuizPage({ navigation }) {
  const [currentView, setCurrentView] = useState('subjects'); // 'subjects' or 'units'
  const [selectedSubject, setSelectedSubject] = useState(null);

  const navigateToUnit = (subject) => {
    setSelectedSubject(subject);
    setCurrentView('units');
  };

  const navigateBackToSubjects = () => {
    setCurrentView('subjects');
    setSelectedSubject(null);
  };

  // Render Unit Directory if a subject is selected
  if (currentView === 'units') {
    return (
      <UnitDirectoryPage 
        navigation={{ goBack: navigateBackToSubjects }}
        route={{ params: { subject: selectedSubject } }}
      />
    );
  }

  // Render Subject Directory by default
  return (
    <SubjectDirectoryPage 
      navigation={{ 
        goBack: navigation?.goBack, 
        navigateToUnit 
      }} 
    />
  );
}