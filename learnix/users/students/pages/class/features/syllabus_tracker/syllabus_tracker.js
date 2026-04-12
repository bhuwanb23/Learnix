import React, { useState } from 'react';
import SubjectListPage from './subject_list/subject_list';

export default function SyllabusTrackerPage({ navigation }) {
  const [currentView, setCurrentView] = useState('subjects'); // 'subjects' or other future views

  const navigateBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Render Subject List
  if (currentView === 'subjects') {
    return (
      <SubjectListPage 
        navigation={{ goBack: navigateBack }}
      />
    );
  }

  return null;
}
