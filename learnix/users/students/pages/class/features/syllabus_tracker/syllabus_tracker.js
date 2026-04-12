import React, { useState } from 'react';
import SubjectListPage from './subject_list/subject_list';
import UnitListPage from './unit_list/unit_list';

export default function SyllabusTrackerPage({ navigation }) {
  const [currentView, setCurrentView] = useState('subjects'); // 'subjects' or 'units'
  const [selectedSubject, setSelectedSubject] = useState(null);

  const navigateBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const navigateToUnits = (subject) => {
    setSelectedSubject(subject);
    setCurrentView('units');
  };

  const navigateBackToSubjects = () => {
    setCurrentView('subjects');
    setSelectedSubject(null);
  };

  // Render Unit List
  if (currentView === 'units') {
    return (
      <UnitListPage 
        navigation={{ 
          goBack: navigateBackToSubjects,
          navigateToSubjects: navigateBackToSubjects
        }}
        route={{ params: { subject: selectedSubject } }}
      />
    );
  }

  // Render Subject List
  if (currentView === 'subjects') {
    return (
      <SubjectListPage 
        navigation={{ 
          goBack: navigateBack,
          navigateToUnits 
        }}
      />
    );
  }

  return null;
}
