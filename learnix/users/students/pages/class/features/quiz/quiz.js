import React, { useState } from 'react';
import SubjectDirectoryPage from './subject_directory/subject_directory';
import UnitDirectoryPage from './unit_directory/unit_directory';
import TopicDirectoryPage from './topic_directory/topic_directory';
import ProfessionalFormPage from './professional_form/professional_form';
import QuizAttemptPage from './quiz_attempt/quiz_attempt';
import ResultsPage from './results/results';
import ReviewPage from './review/review';

export default function QuizPage({ navigation }) {
  const [currentView, setCurrentView] = useState('subjects'); // 'subjects', 'units', 'topics', 'form', 'attempt', 'results', or 'review'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quizConfig, setQuizConfig] = useState(null);

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

  const navigateToAttempt = (config) => {
    setQuizConfig(config);
    setCurrentView('attempt');
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

  const navigateBackToForm = () => {
    setCurrentView('form');
    setQuizConfig(null);
  };

  const navigateToResults = () => {
    setCurrentView('results');
  };

  const navigateBackToAttempt = () => {
    setCurrentView('attempt');
  };

  const navigateToReview = () => {
    setCurrentView('review');
  };

  const navigateBackToResults = () => {
    setCurrentView('results');
  };

  // Render Review if reviewing answers
  if (currentView === 'review') {
    return (
      <ReviewPage 
        navigation={{ goBack: navigateBackToResults }}
      />
    );
  }

  // Render Results if quiz is submitted
  if (currentView === 'results') {
    return (
      <ResultsPage 
        navigation={{ 
          goBack: navigateBackToAttempt,
          navigateToReview 
        }}
      />
    );
  }

  // Render Quiz Attempt if quiz is started
  if (currentView === 'attempt') {
    return (
      <QuizAttemptPage 
        navigation={{ 
          goBack: navigateBackToForm,
          navigateToResults 
        }}
        route={{ params: { config: quizConfig } }}
      />
    );
  }

  // Render Professional Form if a topic is selected
  if (currentView === 'form') {
    return (
      <ProfessionalFormPage 
        navigation={{ 
          goBack: navigateBackToTopics,
          navigateToAttempt 
        }}
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