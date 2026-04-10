import React, { useState } from 'react';
import SubjectDirectoryPage from './subject_directory/subject_directory';
import UnitDirectoryPage from './unit_directory/unit_directory';
import TopicDirectoryPage from './topic_directory/topic_directory';
import ProfessionalFormPage from './professional_form/professional_form';

export default function QuizPage({ navigation }) {
  const [currentView, setCurrentView] = useState('subjects'); // 'subjects', 'units', 'topics', or 'form'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const navigateToUnit = (subject) => {
    setSelectedSubject(subject);
    setCurrentView('units');
  };

  const navigateToTopic = (unit) => {
    setSelectedUnit(unit);
    setCurrentView('topics');
  };

  const navigateToForm = (topic) => {
    setSelectedTopic(topic);
    setCurrentView('form');
  };

  const navigateBackToSubjects = () => {
    setCurrentView('subjects');
    setSelectedSubject(null);
  };

  const navigateBackToUnits = () => {
    setCurrentView('units');
    setSelectedUnit(null);
  };

  const navigateBackToTopics = () => {
    setCurrentView('topics');
    setSelectedTopic(null);
  };

  // Render Professional Form if a topic is selected
  if (currentView === 'form') {
    return (
      <ProfessionalFormPage 
        navigation={{ goBack: navigateBackToTopics }}
        route={{ params: { topic: selectedTopic } }}
      />
    );
  }

  // Render Topic Directory if a unit is selected
  if (currentView === 'topics') {
    return (
      <TopicDirectoryPage 
        navigation={{ 
          goBack: navigateBackToUnits,
          navigateToForm 
        }}
        route={{ params: { unit: selectedUnit } }}
      />
    );
  }

  // Render Unit Directory if a subject is selected
  if (currentView === 'units') {
    return (
      <UnitDirectoryPage 
        navigation={{ 
          goBack: navigateBackToSubjects,
          navigateToTopic 
        }}
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