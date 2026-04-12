import React, { useState } from 'react';
import SubjectListPage from './subject_list/subject_list';
import UnitListPage from './unit_list/unit_list';
import TopicListPage from './topic_list/topic_list';

export default function SyllabusTrackerPage({ navigation }) {
  const [currentView, setCurrentView] = useState('subjects'); // 'subjects', 'units', or 'topics'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const navigateBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const navigateToUnits = (subject) => {
    setSelectedSubject(subject);
    setCurrentView('units');
  };

  const navigateToTopics = (unit) => {
    setSelectedUnit(unit);
    setCurrentView('topics');
  };

  const navigateBackToSubjects = () => {
    setCurrentView('subjects');
    setSelectedSubject(null);
  };

  const navigateBackToUnits = () => {
    setCurrentView('units');
    setSelectedUnit(null);
  };

  // Render Topic List
  if (currentView === 'topics') {
    return (
      <TopicListPage 
        navigation={{ 
          goBack: navigateBackToUnits,
          navigateToUnits: navigateBackToUnits
        }}
        route={{ params: { unit: selectedUnit } }}
      />
    );
  }

  // Render Unit List
  if (currentView === 'units') {
    return (
      <UnitListPage 
        navigation={{ 
          goBack: navigateBackToSubjects,
          navigateToSubjects: navigateBackToSubjects,
          navigateToTopics
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
