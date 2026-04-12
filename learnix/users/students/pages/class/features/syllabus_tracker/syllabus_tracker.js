import React, { useState } from 'react';
import SubjectListPage from './subject_list/subject_list';
import UnitListPage from './unit_list/unit_list';
import TopicListPage from './topic_list/topic_list';
import TopicTrackerPage from './topic_tracker/topic_tracker';

export default function SyllabusTrackerPage({ navigation }) {
  const [currentView, setCurrentView] = useState('subjects'); // 'subjects', 'units', 'topics', or 'tracker'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

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

  const navigateToTracker = (topic) => {
    setSelectedTopic(topic);
    setCurrentView('tracker');
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

  // Render Topic List
  if (currentView === 'topics') {
    return (
      <TopicListPage 
        navigation={{ 
          goBack: navigateBackToUnits,
          navigateToUnits: navigateBackToUnits,
          navigateToTracker
        }}
        route={{ params: { unit: selectedUnit } }}
      />
    );
  }

  // Render Topic Tracker
  if (currentView === 'tracker') {
    return (
      <TopicTrackerPage 
        navigation={{ 
          goBack: navigateBackToTopics,
          navigateToTopics: navigateBackToTopics
        }}
        route={{ params: { topic: selectedTopic } }}
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
